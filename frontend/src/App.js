import logo from './logo.svg';
import './App.css';
import Landing from './components/Landing';
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <div className="App">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          P2P video chat
        </p>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
          </Routes>
        </BrowserRouter>
    </div>
  );
}

export default App;
