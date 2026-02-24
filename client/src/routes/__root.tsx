import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { Toaster } from "sonner"
import ErrorComponent from "@/components/Common/ErrorComponent"
import NotFound from "@/components/Common/NotFound"
import { GameProvider } from "@/contexts/GameContext"

export const Route = createRootRoute({
  component: () => (
    <GameProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
        <Toaster position="top-center" richColors />
        <TanStackRouterDevtools />
        <ReactQueryDevtools />
      </div>
    </GameProvider>
  ),
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
})
