import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AuditForm from "./pages/AuditForm";
import AuditDashboard from "./pages/AuditDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import FieldEngineer from "./pages/FieldEngineer";
import AnalyzingScreen from "./pages/AnalyzingScreen";
import LinkPlanner from "./pages/LinkPlanner";

function LinkPlannerRoute() {
  return (
    <DashboardLayout>
      <LinkPlanner />
    </DashboardLayout>
  );
}

function AdminRoute() {
  return (
    <DashboardLayout>
      <AdminDashboard />
    </DashboardLayout>
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/audit/new"} component={AuditForm} />
      <Route path={"/audit/analyzing/:id"} component={AnalyzingScreen} />
      <Route path={"/audit/:id"} component={AuditDashboard} />
      <Route path={"/field/:id"} component={FieldEngineer} />
      <Route path={"/field"} component={FieldEngineer} />
      <Route path={"/admin"} component={AdminRoute} />
      <Route path={"/link-planner"} component={LinkPlannerRoute} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
