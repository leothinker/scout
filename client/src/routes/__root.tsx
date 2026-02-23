import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { GameProvider } from "@/contexts/GameContext"

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="scout-theme">
      <GameProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Outlet />
          <Toaster position="top-center" richColors />
          <TanStackRouterDevtools />
          <ReactQueryDevtools />
        </div>
      </GameProvider>
    </ThemeProvider>
  ),
})
