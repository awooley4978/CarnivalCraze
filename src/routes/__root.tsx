import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { TicketProvider } from "~/context/TicketContext";
import { PrizeProvider } from "~/context/PrizeContext";
import { SceneProvider, useSceneTransition } from "~/context/SceneContext";
import BulbMarquee from "~/components/BulbMarquee";
import TicketCounter from "~/components/TicketCounter";
import SceneTransition from "~/components/SceneTransition";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Carnival Craze" },
      // PWA meta tags
      { name: "theme-color", content: "#1A0A2E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      { name: "apple-mobile-web-app-title", content: "Carnival Craze" },
      {
        name: "description",
        content:
          "Step right up! Play carnival games and win ridiculous prizes!",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Fredoka:wght@400;500;600;700&display=swap",
      },
      // PWA manifest and icons
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <TicketProvider>
      <PrizeProvider>
        <SceneProvider>
          <RootDocument>
            <Outlet />
          </RootDocument>
        </SceneProvider>
      </PrizeProvider>
    </TicketProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <BulbMarquee />
        <SceneTransitionWrapper>{children}</SceneTransitionWrapper>
        <TicketCounter />
        <Scripts />
        {/* Service Worker registration for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

/** Inner component that consumes SceneContext for dynamic transition state */
function SceneTransitionWrapper({ children }: { children: ReactNode }) {
  const { isTransitioning, consumeDarkCallback } = useSceneTransition();

  return (
    <SceneTransition
      isOpen={!isTransitioning}
      onDark={() => {
        const cb = consumeDarkCallback();
        cb?.();
      }}
    >
      {children}
    </SceneTransition>
  );
}
