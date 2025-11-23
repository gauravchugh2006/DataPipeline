import ReminderConfigurator from "../../components/ReminderConfigurator";

const ReminderConfigurationPage = () => (
  <div className="reminder-page">
    <header>
      <h1>Reminder configuration</h1>
      <p>
        Manage cross-sell nudges, quiet hours, and CSR routing to align with loyalty recommendations.
      </p>
    </header>
    <ReminderConfigurator />
  </div>
);

export default ReminderConfigurationPage;
