import { BrowserRouter, Routes, Route } from "react-router-dom";
import CreateRoom from "./pages/CreateRoom.jsx";
import JoinRoom from "./pages/JoinRoom.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/join" element={<JoinRoom />} />
      </Routes>
    </BrowserRouter>
  );
}
