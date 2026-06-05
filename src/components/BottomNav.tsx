import { NavLink } from 'react-router-dom'
import './BottomNav.css'

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <NavLink
        to="/study"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`}
      >
        <span className="bottom-nav-icon" aria-hidden>
          📖
        </span>
        <span className="bottom-nav-label">学习</span>
      </NavLink>
      <NavLink
        to="/dictionaries"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`}
      >
        <span className="bottom-nav-icon" aria-hidden>
          📚
        </span>
        <span className="bottom-nav-label">词书</span>
      </NavLink>
      <NavLink to="/me" className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`}>
        <span className="bottom-nav-icon" aria-hidden>
          👤
        </span>
        <span className="bottom-nav-label">我的</span>
      </NavLink>
    </nav>
  )
}
