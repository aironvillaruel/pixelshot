"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GardenTheme from "../../components/theme/garden";

type Theme = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

const themes: Theme[] = [
  {
    id: "garden",
    name: "Garden",
    description: "A romantic garden filled with flowers.",
    icon: "🌹",
  },
  {
    id: "romantic",
    name: "Romantic",
    description: "Soft colors, hearts and dreamy atmosphere.",
    icon: "💗",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "A mysterious garden underneath the stars.",
    icon: "🌙",
  },
];

export default function Home() {
  const router = useRouter();

  const [selectedTheme, setSelectedTheme] = useState("garden");

  const [images, setImages] = useState<string[]>([
    "/images/placeholder.jpg",
    "/images/placeholder.jpg",
    "/images/placeholder.jpg",
  ]);

  const [isSaving, setIsSaving] = useState(false);

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") return;

      setImages((current) => {
        const updated = [...current];
        updated[index] = result;
        return updated;
      });
    };

    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setIsSaving(true);

    // Store the selected theme
    sessionStorage.setItem("selectedTheme", selectedTheme);

    // Store the images temporarily
    sessionStorage.setItem(
      "gardenImages",
      JSON.stringify(images)
    );

    setTimeout(() => {
      router.push(`/preview/${selectedTheme}`);
    }, 500);
  };

  return (
    <main className="min-h-screen bg-[#e8e3d9] text-zinc-900">
      {/* Top navigation */}
      <header className="border-b border-black/10 bg-[#f5f1e8]/90 px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold">
              Create Your Story
            </h1>

            <p className="text-sm text-zinc-500">
              Choose a theme and personalize your page.
            </p>
          </div>

          <div className="text-sm text-zinc-500">
            Step 1 of 2
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[380px_1fr]">
        {/* LEFT SIDE */}
        <aside className="space-y-8">
          {/* Theme selector */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">
              Choose your theme
            </h2>

            <div className="space-y-3">
              {themes.map((theme) => {
                const active = selectedTheme === theme.id;

                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#7a9270] bg-[#edf3e9] shadow-md"
                        : "border-black/10 bg-white hover:border-black/30"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-2xl">
                      {theme.icon}
                    </div>

                    <div className="flex-1">
                      <div className="font-semibold">
                        {theme.name}
                      </div>

                      <div className="mt-1 text-sm text-zinc-500">
                        {theme.description}
                      </div>
                    </div>

                    {active && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#71866a] text-xs text-white">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Images */}
          <section>
            <h2 className="mb-2 text-lg font-semibold">
              Add your photos
            </h2>

            <p className="mb-4 text-sm text-zinc-500">
              These photos will appear in your final website.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => fileRefs.current[index]?.click()}
                  className="group relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 bg-white"
                >
                  <img
                    src={image}
                    alt={`Photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <span className="text-sm font-medium text-white">
                      Change
                    </span>
                  </div>

                  <input
                    ref={(element) => {
                      fileRefs.current[index] = element;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      handleImageChange(event, index)
                    }
                  />
                </button>
              ))}
            </div>
          </section>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-xl bg-[#304432] px-6 py-4 font-semibold text-white shadow-lg transition hover:bg-[#263a2b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving
              ? "Preparing your garden..."
              : "Preview & Continue →"}
          </button>
        </aside>

        {/* RIGHT SIDE */}
        <section className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Live Preview
              </h2>

              <p className="text-sm text-zinc-500">
                This is approximately how your final page will look.
              </p>
            </div>

            <div className="rounded-full bg-white px-4 py-2 text-xs font-medium shadow-sm">
              {themes.find((theme) => theme.id === selectedTheme)?.name}
            </div>
          </div>

          {/* Browser frame */}
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-zinc-900 shadow-2xl">
            {/* Browser bar */}
            <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-zinc-800 px-4">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />

              <div className="ml-4 flex-1 rounded-md bg-zinc-700 px-4 py-1 text-center text-xs text-zinc-400">
                yourstory.com
              </div>
            </div>

            {/* Actual preview */}
            <div className="h-[750px] overflow-y-auto bg-white">
              {selectedTheme === "garden" && (
                <GardenTheme
                  images={images}
                  preview
                />
              )}

              {selectedTheme === "romantic" && (
                <div className="flex min-h-full items-center justify-center bg-pink-100 p-10 text-center">
                  <div>
                    <div className="text-7xl">💗</div>
                    <h1 className="mt-5 font-serif text-5xl font-bold">
                      Our Story
                    </h1>
                    <p className="mt-4 text-zinc-600">
                      Romantic theme coming next...
                    </p>
                  </div>
                </div>
              )}

              {selectedTheme === "midnight" && (
                <div className="flex min-h-full items-center justify-center bg-[#101b18] p-10 text-center text-white">
                  <div>
                    <div className="text-7xl">🌙</div>
                    <h1 className="mt-5 font-serif text-5xl font-bold">
                      Under the Stars
                    </h1>
                    <p className="mt-4 text-zinc-400">
                      Midnight garden theme coming next...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}