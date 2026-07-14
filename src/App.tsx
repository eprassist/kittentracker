import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { Layout } from "./components/Layout";
import { ChartPage } from "./pages/ChartPage";
import { Dashboard } from "./pages/Dashboard";
import { KittenProfile } from "./pages/KittenProfile";
import { Kittens } from "./pages/Kittens";
import { LogWeighIn } from "./pages/LogWeighIn";
import { Settings } from "./pages/Settings";
import { Timeline } from "./pages/Timeline";

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chart" element={<ChartPage />} />
            <Route path="/log" element={<LogWeighIn />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/kittens" element={<Kittens />} />
            <Route path="/kittens/:id" element={<KittenProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthGate>
  );
}
