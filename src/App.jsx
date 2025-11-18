import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import Questions from "./pages/Questions";
import AdminDashboard from "./pages/AdminDashboard";
import JoinRoom from "./pages/JoinRoom";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Scoreboard from "./pages/Scoreboard";
import ImportQuestions from "./pages/ImportQuestions";
import SelectQuestions from "./pages/SelectQuestions";

// Testovací stránky
import TestMode from "./pages/TestMode";
import TestInteractive from "./pages/TestInteractive";
import TeamTest from "./pages/TeamTest";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* Host */}
        <Route path="/create" element={<CreateRoom />} />
        <Route path="/host/:roomCode/questions" element={<Questions />} />
        <Route path="/host/:roomCode/dashboard" element={<AdminDashboard />} />
        <Route path="/host/:roomCode/select-questions" element={<SelectQuestions />} />

        {/* Player */}
        <Route path="/join" element={<JoinRoom />} />
        <Route path="/lobby/:roomCode" element={<Lobby />} />
        <Route path="/game/:roomCode/:playerId" element={<Game />} />
        <Route path="/scoreboard/:roomCode" element={<Scoreboard />} />

        {/* Import */}
        <Route path="/import" element={<ImportQuestions />} />

        {/* ⭐ Testovací módy */}
        <Route path="/test" element={<TestMode />} />
        <Route path="/testinteractive" element={<TestInteractive />} />
        <Route path="/teamtest" element={<TeamTest />} />

      </Routes>
    </BrowserRouter>
  );
}

