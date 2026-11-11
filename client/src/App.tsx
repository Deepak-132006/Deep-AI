import Inputbar from "./components/chat/Inputbar";
import OrbWindow from "./components/orb/OrbWindow";

function App() {
  const isOrbWindow = window.location.hash === "#orb";

  if (isOrbWindow) {
    return <OrbWindow />;
  }

  return <Inputbar />;
}

export default App;