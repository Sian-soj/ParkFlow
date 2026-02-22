import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ResidentLogin from './pages/ResidentLogin';
import ResidentDashboard from './pages/ResidentDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="resident/login" element={<ResidentLogin />} />
        <Route path="resident" element={<ResidentDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
