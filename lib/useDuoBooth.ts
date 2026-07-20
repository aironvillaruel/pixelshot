"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// Public STUN only. Some networks (strict NATs, certain carriers/routers)
// will need a TURN server to connect reliably — see README notes.
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type BoothStatus = "connecting" | "waiting" | "connected" | "full";

export interface SessionConfig {
  shots: number;
  orientation: "landscape" | "portrait";
}

interface UseDuoBoothArgs {
  roomId: string;
  /** Only the booth creator should pass a config here — the joining
   *  partner passes null and receives it over the wire instead. */
  hostConfig: SessionConfig | null;
  /** Called whenever the room (host or guest) is told to start a shot
   *  sequence — both sides receive this at the same time. */
  onSessionStart: (config: SessionConfig) => void;
}

export function useDuoBooth({ roomId, hostConfig, onSessionStart }: UseDuoBoothArgs) {
  const [status, setStatus] = useState<BoothStatus>("connecting");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [config, setConfig] = useState<SessionConfig | null>(hostConfig);
  const [partnerConnected, setPartnerConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const politeRef = useRef(false); // set once we know join order
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  // A partner-less room has nowhere to send an offer, so we hold off
  // negotiating until someone's actually there to receive it — otherwise
  // the offer just evaporates and leaves signalingState stuck, causing
  // the *real* offer (sent once a partner joins) to look like a false
  // collision and get ignored.
  const partnerPresentRef = useRef(false);
  const pendingNegotiationRef = useRef(false);

  // Keep the latest callback/config without re-running the connection effect
  const onSessionStartRef = useRef(onSessionStart);
  useEffect(() => {
    onSessionStartRef.current = onSessionStart;
  }, [onSessionStart]);
  const hostConfigRef = useRef(hostConfig);
  useEffect(() => {
    hostConfigRef.current = hostConfig;
  }, [hostConfig]);

  useEffect(() => {
    if (!roomId) return;

    const socket = io({ autoConnect: false });
    socketRef.current = socket;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
  console.log("[duo-booth] ICE state:", pc.iceConnectionState);
};
pc.onconnectionstatechange = () => {
  console.log("[duo-booth] connection state:", pc.connectionState);
};
pc.onicecandidateerror = (e) => {
  console.log("[duo-booth] ICE candidate error:", e);
};
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      setStatus("connected");
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", { roomId, data: { type: "ice", candidate: event.candidate } });
      }
    };

    // Actually create and send the offer. Only ever called once we know
    // there's a partner in the room to receive it.
    const createAndSendOffer = async () => {
      try {
        makingOfferRef.current = true;
        await pc.setLocalDescription();
        socket.emit("signal", { roomId, data: { type: "offer", sdp: pc.localDescription } });
      } catch (err) {
        console.error("negotiation error", err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    // "Perfect negotiation" — needed because both sides add a local video
    // track independently, so both can trigger renegotiation at once.
    // The "polite" peer backs off on a collision instead of both sides
    // fighting over who's offering. We also defer the offer entirely if
    // no partner has joined yet (see partnerPresentRef above).
    pc.onnegotiationneeded = async () => {
      if (!partnerPresentRef.current) {
        pendingNegotiationRef.current = true;
        return;
      }
      await createAndSendOffer();
    };

    socket.on("joined", ({ isInitiator }: { isInitiator: boolean }) => {
      politeRef.current = !isInitiator;
      // If we're not the initiator, we only ever join a room that already
      // has someone in it (rooms cap at two) — so our partner is present
      // from the very start of our connection.
      if (!isInitiator) partnerPresentRef.current = true;
      setStatus("waiting");
    });

    socket.on("room-full", () => setStatus("full"));

    socket.on("peer-joined", () => {
      setStatus("connecting");
      setPartnerConnected(true);
      partnerPresentRef.current = true;

      // If we're the host, this is the moment to hand our chosen
      // shots/orientation over to the partner who just joined.
      if (hostConfigRef.current) {
        socket.emit("host-config", { roomId, config: hostConfigRef.current });
      }

      // Fire any offer that was held back while we were alone in the room.
      if (pendingNegotiationRef.current) {
        pendingNegotiationRef.current = false;
        createAndSendOffer();
      }
    });

    socket.on("peer-left", () => {
      setRemoteStream(null);
      setPartnerConnected(false);
      setStatus("waiting");
      partnerPresentRef.current = false;
    });

    socket.on("host-config", (cfg: SessionConfig) => setConfig(cfg));

    socket.on("session-start", (cfg: SessionConfig) => onSessionStartRef.current(cfg));

    socket.on("signal", async ({ data }: { data: any }) => {
      try {
        if (data.type === "offer" || data.type === "answer") {
          const offerCollision =
            data.type === "offer" && (makingOfferRef.current || pc.signalingState !== "stable");

          ignoreOfferRef.current = !politeRef.current && offerCollision;
          if (ignoreOfferRef.current) return;

          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: "rollback" }),
              pc.setRemoteDescription(new RTCSessionDescription(data.sdp)),
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          }

          if (data.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("signal", { roomId, data: { type: "answer", sdp: pc.localDescription } });
          }
        } else if (data.type === "ice") {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            if (!ignoreOfferRef.current) throw err;
          }
        }
      } catch (err) {
        console.error("signal handling error", err);
      }
    });

    socket.connect();
    socket.emit("join-room", roomId);

    return () => {
      socket.disconnect();
      pc.close();
      pcRef.current = null;
      socketRef.current = null;
    };
    // Deliberately only re-run if the room changes — hostConfig/onSessionStart
    // are read through refs above so identity changes don't reconnect sockets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const attachLocalStream = useCallback((stream: MediaStream) => {
    const pc = pcRef.current;
    if (!pc) return;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    setLocalStream(stream);
  }, []);

  const detachLocalStream = useCallback(() => {
    const pc = pcRef.current;
    if (pc) {
      pc.getSenders().forEach((sender) => {
        if (sender.track) pc.removeTrack(sender);
      });
    }
    setLocalStream(null);
  }, []);

  const requestSession = useCallback(
    (cfg: SessionConfig) => {
      socketRef.current?.emit("request-session", { roomId, config: cfg });
    },
    [roomId]
  );

  return {
    status,
    localStream,
    remoteStream,
    config,
    partnerConnected,
    attachLocalStream,
    detachLocalStream,
    requestSession,
  };
}