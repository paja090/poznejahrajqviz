import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import Lobby from "./pages/Lobby";
import Questions from "./pages/Questions";
import Game from "./pages/Game";
import Scoreboard from "./pages/Scoreboard";
import AdminDashboard from "./pages/AdminDashboard";
import ImportQuestions from "./pages/ImportQuestions";
import SelectQuestions from "./pages/SelectQuestions";
import TestMode from "./pages/TestMode";




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

        {/* Player */}
        <Route path="/join" element={<JoinRoom />} />
        <Route path="/lobby/:roomCode" element={<Lobby />} />
        <Route path="/game/:roomCode/:playerId" element={<Game />} />
        <Route path="/scoreboard/:roomCode" element={<Scoreboard />} />
        <Route path="/import" element={<ImportQuestions />} />
        <Route path="/host/:roomCode/select-questions" element={<SelectQuestions />} />
      </Routes>
      {/* ⭐ Test Mode */}
        <Route path="/test" element={<TestMode />} />
      </Routes>
    </BrowserRouter>
  );
}

