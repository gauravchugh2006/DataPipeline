import { Link } from "react-router-dom";

const DashboardLanding = () => (
  <main className="dashboard-landing">
    <h1>Cafe Analytics Console</h1>
    <p>
      Explore loyalty recommendations, transparency insights, reminder preferences, and the admin console.
    </p>
    <nav>
      <ul>
        <li>
          <Link to="/reminders">Reminder configuration</Link>
        </li>
        <li>
          <Link to="/admin">Admin console</Link>
        </li>
      </ul>
    </nav>
  </main>
);

export default DashboardLanding;
