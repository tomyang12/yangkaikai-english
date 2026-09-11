import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import UnitList from './pages/UnitList';
import StudyMode from './pages/StudyMode';
import Flashcards from './pages/Flashcards';
import Dictation from './pages/Dictation';
import Listening from './pages/Listening';
import Choice from './pages/Choice';
import SentenceFill from './pages/SentenceFill';
import Challenge from './pages/Challenge';
import ErrorBook from './pages/ErrorBook';
import Report from './pages/Report';
import Admin from './pages/Admin';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/:gradeTerm" element={<UnitList />} />
          <Route path="/:gradeTerm/:unitId" element={<StudyMode />} />
          <Route path="/:gradeTerm/:unitId/flashcards" element={<Flashcards />} />
          <Route path="/:gradeTerm/:unitId/dictation" element={<Dictation />} />
          <Route path="/:gradeTerm/:unitId/listening" element={<Listening />} />
          <Route path="/:gradeTerm/:unitId/choice" element={<Choice />} />
          <Route path="/:gradeTerm/:unitId/sentence" element={<SentenceFill />} />
          <Route path="/:gradeTerm/:unitId/challenge" element={<Challenge />} />
          <Route path="/error-book" element={<ErrorBook />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
