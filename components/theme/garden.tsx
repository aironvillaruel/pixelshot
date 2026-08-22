"use client";

import { motion } from "motion/react";

type GardenThemeProps = {
  images: string[];
  preview?: boolean;
};

export default function GardenTheme({
  images,
  preview = false,
}: GardenThemeProps) {
  const photos = [
    images[0] || "/images/placeholder.jpg",
    images[1] || "/images/placeholder.jpg",
    images[2] || "/images/placeholder.jpg",
  ];

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-[#dce8d5] ${
        preview ? "text-sm" : ""
      }`}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#fff7ef_0%,#f5ddd5_35%,#b7cba9_100%)]" />

      {/* Soft glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.7)_0%,transparent_65%)]" />

      {/* Background flowers */}
      <div className="pointer-events-none absolute left-[5%] top-[12%] text-7xl opacity-50">
        🌹
      </div>

      <div className="pointer-events-none absolute right-[8%] top-[18%] text-7xl opacity-50">
        🌷
      </div>

      <div className="pointer-events-none absolute bottom-[15%] left-[8%] text-7xl opacity-40">
        🌸
      </div>

      <div className="pointer-events-none absolute bottom-[20%] right-[10%] text-7xl opacity-40">
        🌺
      </div>

      {/* Petals */}
      {!preview && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, index) => (
            <motion.div
              key={index}
              className="absolute"
              initial={{
                top: "-10%",
                left: `${(index * 31) % 100}%`,
                opacity: 0,
              }}
              animate={{
                top: "110%",
                left: `${((index * 31) % 100) + 5}%`,
                rotate: 360,
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: 8 + (index % 5),
                delay: index * 0.4,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              🌸
            </motion.div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 px-5 py-20 text-center">
        <div className="mb-3 text-lg text-[#a85d67]">
          ❧ ♡ ❧
        </div>

        <h1 className="font-serif text-4xl font-bold text-[#263b2c] sm:text-6xl">
          The Garden
          <br />
          <span className="font-normal italic">of Us</span>
        </h1>

        <p className="mt-4 font-serif italic text-[#526554]">
          Where every bloom reminds me of you.
        </p>

        {/* Images */}
        <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center justify-center gap-5 sm:flex-row">
          {photos.map((image, index) => (
            <motion.div
              key={index}
              whileHover={!preview ? { scale: 1.05, rotate: 0 } : {}}
              className={`w-[75%] max-w-[180px] bg-[#fffaf3] p-2 pb-7 shadow-xl sm:w-1/3 ${
                index === 0
                  ? "-rotate-6"
                  : index === 1
                    ? "z-10"
                    : "rotate-6"
              }`}
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={image}
                  alt={`Memory ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Letter */}
        <div className="mx-auto mt-16 max-w-2xl bg-[#fffaf0] p-8 text-left shadow-xl sm:p-12">
          <div className="text-center text-xl text-[#a85d67]">
            ❧ ♥ ❧
          </div>

          <h2 className="mt-3 text-center font-serif text-3xl font-bold text-[#304432]">
            A Letter for You
          </h2>

          <div className="mt-8 space-y-4 font-serif leading-7 text-[#4d5148]">
            <p>Dear you,</p>

            <p>
              If this page were a garden, I think you would be
              the flower that somehow catches my attention no matter
              where I stand.
            </p>

            <p>
              I made this little garden just for you — a place
              filled with flowers, memories, and words that I
              couldn't quite say out loud.
            </p>

            <p className="text-right italic text-[#a85d67]">
              Someone who admires you ♡
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}