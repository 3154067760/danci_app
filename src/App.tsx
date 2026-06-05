import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import AddWordPage from './pages/AddWordPage'
import BatchImportPage from './pages/BatchImportPage'
import AiImageEnrichPage from './pages/AiImageEnrichPage'
import DetailPage from './pages/DetailPage'
import DictionariesPage from './pages/DictionariesPage'
import DictionaryDetailPage from './pages/DictionaryDetailPage'
import ProfilePage from './pages/ProfilePage'
import SharePage from './pages/SharePage'
import WordPickerPage from './pages/WordPickerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/share" element={<SharePage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/study/detail/1" replace />} />
          <Route path="/study" element={<Navigate to="/study/detail/1" replace />} />
          <Route path="/study/detail/:id" element={<DetailPage />} />
          <Route path="/dictionaries" element={<DictionariesPage />} />
          <Route path="/words/add" element={<AddWordPage />} />
          <Route path="/words/batch-import" element={<BatchImportPage />} />
          <Route path="/words/ai-enrich" element={<AiImageEnrichPage />} />
          <Route path="/dictionaries/:dictId" element={<DictionaryDetailPage />} />
          <Route path="/dictionaries/:dictId/pick" element={<WordPickerPage />} />
          <Route path="/me" element={<ProfilePage />} />
          <Route path="/detail/:id" element={<Navigate to="/study/detail/:id" replace />} />
          <Route path="*" element={<Navigate to="/study/detail/1" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
