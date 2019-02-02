import React from 'react'
import { Link } from 'gatsby'
import avatar from '../img/steve.png'

const Navbar = class extends React.Component {

 render() {
   return (
  
  <nav className="navbar is-transparent" role="navigation" aria-label="main-navigation">
    <div className="container">
      <div id="navMenu" className="navbar-menu">
      <div className="navbar-start has-text-centered">
        <Link className="navbar-item" to="/">
          Steve McGill - Ramblings about Sitecore, EXM, and more
        </Link>
      </div>
      <div className="navbar-end has-text-centered">
        <Link className="navbar-item" to="/about">
        <span className="icon">
            <img src={avatar} alt="About Me" />
          </span>
        </Link>
      </div>
      </div>
    </div>
  </nav>
  )}
}

export default Navbar
