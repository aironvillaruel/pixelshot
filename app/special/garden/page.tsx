"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useMemo } from "react";

const photos = [
  {
    src: "/strips/pixelshot (15).png",
    rotation: -7,
    className: "md:translate-y-12",
  },
  {
    src: "/strips/pixelshot (16).png",
    rotation: 0,
    className: "z-20",
  },
  {
    src: "/strips/pixelshot (17).png",
    rotation: 7,
    className: "md:translate-y-12",
  },
];

const flowers = [
  "🌹",
  "🌷",
  "🌸",
  "🌺",
  "🌼",
  "🌻",
  "💐",
  "🌷",
];

function FallingPetals() {
  const petals = useMemo(
    () =>
      Array.from({ length: 45 }, (_, i) => {
        // Deterministic values based on the petal index.
        // This guarantees the server and client render the same HTML.
        const left = (i * 37.7) % 100;
        const delay = (i * 1.73) % 10;
        const duration = 8 + ((i * 2.31) % 10);
        const size = 10 + ((i * 3.17) % 18);
        const rotation = (i * 47) % 360;
        const blur = i % 4 === 0;
        const opacity = 0.35 + ((i * 0.137) % 0.6);
        const drift = ((i * 13.7) % 12) - 6;

        return {
          id: i,
          left,
          delay,
          duration,
          size,
          rotation,
          blur,
          opacity,
          drift,
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {petals.map((petal) => (
        <motion.div
          key={petal.id}
          className="absolute"
          initial={{
            top: "-10%",
            left: `${petal.left}%`,
            rotate: petal.rotation,
            opacity: 0,
          }}
          animate={{
            top: "110%",
            left: `${petal.left + petal.drift}%`,
            rotate: petal.rotation + 540,
            opacity: [0, petal.opacity, petal.opacity, 0],
          }}
          transition={{
            duration: petal.duration,
            delay: petal.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            fontSize: `${petal.size}px`,
            filter: petal.blur ? "blur(4px)" : "blur(0px)",
          }}
        >
          🌸
        </motion.div>
      ))}
    </div>
  );
}

function BotanicalBackground() {
  return (
    <>
      {/* Large blurred flowers */}
      <div className="pointer-events-none absolute left-[-80px] top-[10%] text-[160px] opacity-20 blur-[2px]">
        🌹
      </div>

      <div className="pointer-events-none absolute right-[-60px] top-[30%] text-[180px] opacity-20 blur-[3px]">
        🌷
      </div>

      <div className="pointer-events-none absolute bottom-[10%] left-[-50px] text-[150px] opacity-20">
        🌺
      </div>

      <div className="pointer-events-none absolute bottom-[20%] right-[-30px] text-[160px] opacity-20 blur-[2px]">
        🌸
      </div>

      {/* Botanical vines */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-32 opacity-40">
        <div className="absolute left-5 top-10 text-7xl">🌿</div>
        <div className="absolute left-0 top-40 text-6xl">🌹</div>
        <div className="absolute left-8 top-72 text-5xl">🌿</div>
        <div className="absolute left-0 top-[600px] text-7xl">🌷</div>
      </div>

      <div className="pointer-events-none absolute right-0 top-0 h-full w-32 opacity-40">
        <div className="absolute right-5 top-20 text-7xl">🌿</div>
        <div className="absolute right-0 top-48 text-6xl">🌸</div>
        <div className="absolute right-8 top-80 text-5xl">🌿</div>
        <div className="absolute right-0 top-[650px] text-7xl">🌹</div>
      </div>
    </>
  );
}

function Hero() {
  const { scrollY } = useScroll();

  const backgroundY = useTransform(scrollY, [0, 800], [0, 220]);
  const titleY = useTransform(scrollY, [0, 800], [0, 140]);
  const flowersY = useTransform(scrollY, [0, 800], [0, -100]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#dce8d5]">
      {/* Garden background */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-[-15%] bg-[radial-gradient(circle_at_center,#fff7ef_0%,#f5ddd5_35%,#b7cba9_100%)]"
      />

      {/* Soft garden glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.7)_0%,transparent_65%)]" />

      {/* Background flowers */}
      <motion.div
        style={{ y: flowersY }}
        className="absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-[5%] top-[15%] text-8xl opacity-60">
          🌹
        </div>

        <div className="absolute right-[8%] top-[18%] text-7xl opacity-60">
          🌷
        </div>

        <div className="absolute left-[15%] bottom-[18%] text-7xl opacity-50">
          🌼
        </div>

        <div className="absolute right-[15%] bottom-[20%] text-8xl opacity-50">
          🌺
        </div>

        <div className="absolute left-[40%] top-[10%] text-5xl opacity-40">
          🌸
        </div>

        <div className="absolute right-[35%] top-[30%] text-6xl opacity-40">
          🌷
        </div>
      </motion.div>

      <BotanicalBackground />

      {/* Hero content */}
      <motion.div
        style={{ y: titleY }}
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 py-20"
      >
        {/* Small decoration */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-5 text-2xl text-[#a85d67]"
        >
          ❧ ♡ ❧
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          className="text-center font-serif text-5xl font-bold tracking-tight text-[#263b2c] drop-shadow-sm sm:text-7xl md:text-8xl lg:text-9xl"
        >
          The Garden
          <br />
          <span className="italic font-normal">of Us</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-6 flex items-center gap-4"
        >
          <span className="h-px w-16 bg-[#7b9472]" />
          <span className="text-xl text-[#a85d67]">♡</span>
          <span className="h-px w-16 bg-[#7b9472]" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-5 max-w-xl text-center font-serif text-lg italic text-[#526554] sm:text-xl"
        >
          Where every bloom reminds me of you.
        </motion.p>

        {/* Photos */}
        <div className="relative mt-16 flex w-full max-w-5xl flex-col items-center justify-center gap-8 md:flex-row md:gap-[-20px]">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.src}
              initial={{
                opacity: 0,
                y: 80,
                rotate: photo.rotation,
              }}
              animate={{
                opacity: 1,
                y: 0,
                rotate: photo.rotation,
              }}
              transition={{
                delay: 1.2 + index * 0.2,
                duration: 1,
                type: "spring",
              }}
              whileHover={{
                scale: 1.06,
                rotate: 0,
                zIndex: 30,
                transition: { duration: 0.3 },
              }}
              className={`relative w-[85%] max-w-[300px] cursor-pointer ${photo.className}`}
            >
              <div className="bg-[#fffaf3] p-3 pb-14 shadow-[0_20px_60px_rgba(44,65,45,0.25)]">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src={photo.src}
                    alt={`Memory ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                </div>

                <p className="absolute bottom-3 left-0 w-full text-center font-serif text-sm italic text-[#687866]">
                  {index === 0 && "A beautiful moment"}
                  {index === 1 && "The one who inspires me"}
                  {index === 2 && "A memory worth keeping"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="mt-20 flex flex-col items-center gap-2 text-[#61745d]"
        >
          <span className="text-sm tracking-[0.3em] uppercase">
            Scroll to explore
          </span>

          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
            }}
            className="text-xl"
          >
            ↓
          </motion.span>
        </motion.div>
      </motion.div>
    </section>
  );
}

function LoveLetter() {
  return (
    <section className="relative overflow-hidden bg-[#f3eadb] px-6 py-32">
      {/* Decorative flowers */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        whileInView={{ opacity: 0.7, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        className="absolute left-[-30px] top-20 text-9xl"
      >
        🌹
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 100 }}
        whileInView={{ opacity: 0.7, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        className="absolute right-[-30px] top-40 text-9xl"
      >
        🌷
      </motion.div>

      <div className="relative z-10 mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1 }}
          className="relative border border-[#d6c6ae] bg-[#fffaf0] px-8 py-16 shadow-[0_30px_80px_rgba(70,70,40,0.15)] sm:px-16"
        >
          {/* Paper texture */}
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#9b8d78_0.5px,transparent_0.5px)] [background-size:12px_12px]" />

          <div className="relative">
            <div className="mb-8 text-center text-2xl text-[#a85d67]">
              ❧ ♥ ❧
            </div>

            <h2 className="text-center font-serif text-4xl font-bold text-[#304432] sm:text-5xl">
              A Letter for You
            </h2>

            <div className="mx-auto mt-5 flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-[#b6a78f]" />
              <span className="text-[#a85d67]">✿</span>
              <span className="h-px w-12 bg-[#b6a78f]" />
            </div>

            <div className="mt-12 space-y-6 font-serif text-lg leading-9 text-[#4d5148]">
              <p>Dear you,</p>

              <p>
                If this page were a garden, I think you would be the flower
                that somehow catches my attention no matter where I stand.
              </p>

              <p>
                There are so many beautiful things in this world, but somehow,
                whenever I think of something beautiful, my thoughts always
                seem to find their way back to you.
              </p>

              <p>
                Maybe it is the way you smile. Maybe it is the little things
                you do without realizing how special they are. Or maybe it is
                simply the way you make an ordinary moment feel a little less
                ordinary.
              </p>

              <p>
                I don't know where this garden leads, and I don't know what
                tomorrow will bring. But I wanted to make this little place
                just for you — a collection of flowers, memories, and words
                that could never quite say everything I feel.
              </p>

              <p>
                So whenever you see these flowers, I hope you remember that
                somewhere, someone thinks you are worth stopping for.
              </p>

              <p>
                Someone admires you.
                <br />
                Someone appreciates you.
                <br />
                Someone is quietly grateful that you exist.
              </p>

              <p className="pt-5 text-right italic">
                Always,
                <br />
                <span className="text-2xl text-[#a85d67]">
                  Someone who admires you ♡
                </span>
              </p>
            </div>

            {/* Wax seal */}
            <div className="mx-auto mt-12 flex h-16 w-16 items-center justify-center rounded-full bg-[#a85d67] text-2xl text-white shadow-lg">
              ♥
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function GardenEnding() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-[#344d38] px-6 py-32 text-center">
      {/* Garden glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,205,157,.25),transparent_60%)]" />

      <div className="absolute inset-0 opacity-20">
        <div className="absolute left-[10%] top-[20%] text-8xl">🌹</div>
        <div className="absolute right-[10%] top-[30%] text-8xl">🌷</div>
        <div className="absolute bottom-[20%] left-[20%] text-7xl">🌸</div>
        <div className="absolute bottom-[15%] right-[20%] text-7xl">🌼</div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="relative z-10"
      >
        <div className="mb-6 text-4xl">🌿 🌹 🌿</div>

        <h2 className="font-serif text-5xl font-bold text-[#f8eee1] sm:text-7xl">
          Some gardens
          <br />
          <span className="italic font-normal">are meant to be remembered.</span>
        </h2>

        <p className="mx-auto mt-8 max-w-xl font-serif text-lg leading-8 text-[#d7e0d0]">
          And perhaps this little garden will always remind me of you.
        </p>

        <div className="mt-10 text-3xl text-[#e9a0a7]">♡</div>
      </motion.div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f3eadb]">
      <FallingPetals />

      <Hero />

      <LoveLetter />

      <GardenEnding />
    </main>
  );
}