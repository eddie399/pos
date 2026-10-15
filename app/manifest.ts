import type { MetadataRoute } from "next";

/**
 * Makes Duka installable: an icon on the home screen that opens in its own
 * window and survives a phone reboot, instead of a browser tab a cashier has to
 * find again. PNG icons for iOS/Android home screens still need to be generated
 * into /public/icons.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Duka POS",
    short_name: "Duka",
    description: "Mobile-first point of sale and shop management for small shops.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#059669",
    icons: [
      {
        src: "/icons/duka.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/duka-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
