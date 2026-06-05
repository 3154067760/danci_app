import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import './AppLayout.css'

export default function AppLayout() {
  return (
    <div className="app-layout">
      <main className="app-layout-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
