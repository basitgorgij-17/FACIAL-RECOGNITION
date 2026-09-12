import { useState, useEffect } from "react";
import supabase from "../supabaseClient";

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    fetchAlerts();
    fetchCameras();

    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        () => {
          fetchAlerts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAlerts() {
    const { data, error } = await supabase
      .from("alerts")
      .select("*, watchlist_persons(name, category)")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Error fetching alerts:", error);
    } else {
      setAlerts(data);
    }
  }

  async function handleStatusChange(alertId, newStatus) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("alerts")
      .update({ status: newStatus, reviewed_by: user.id })
      .eq("id", alertId);

    if (error) {
      console.log("Error updating alert:", error);
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: `Alert marked as ${newStatus}`,
      target_id: alertId,
    });

    fetchAlerts(); // list refresh karo taake naya status dikhe
  }

  async function fetchCameras() {
    const { data, error } = await supabase.from("cameras").select("*");

    if (error) {
      console.log("Error fetching cameras:", error);
    } else {
      setCameras(data);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        {/* Camera Grid — left/main section */}
        <div className="camera-section">
          <h1 className="watchlist-heading">Cameras ({cameras.length})</h1>

          {cameras.length === 0 && (
            <p className="empty-text">No cameras configured yet.</p>
          )}

          <div className="camera-grid">
            {cameras.map((camera) => (
              <div key={camera.id} className="camera-tile">
                <div className="camera-tile-placeholder">
                  {camera.is_active ? "📹" : "⚫"}
                </div>
                <div className="camera-tile-info">
                  <p className="camera-name">{camera.name}</p>
                  <p className="camera-location">{camera.location}</p>
                  <span
                    className={`camera-status ${camera.is_active ? "status-active" : "status-inactive"}`}
                  >
                    {camera.is_active ? "Live" : "Offline"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Panel — side section */}
        <div className="alerts-section">
          <h1 className="watchlist-heading">Live Alerts ({alerts.length})</h1>

          {alerts.length === 0 && <p className="empty-text">No alerts yet.</p>}

          <div className="alerts-list">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-card alert-${alert.status}`}
              >
                <div className="alert-main">
                  <p className="alert-name">
                    {alert.watchlist_persons?.name || "Unknown"}
                  </p>
                  {alert.watchlist_persons?.category && (
                    <span className="watchlist-badge">
                      {alert.watchlist_persons.category}
                    </span>
                  )}
                </div>
                <div className="alert-meta">
                  <span className="alert-confidence">
                    {Math.round(alert.confidence_score * 100)}% match
                  </span>
                  <span className={`alert-status-badge status-${alert.status}`}>
                    {alert.status}
                  </span>

                  {alert.status === "open" && (
                    <div className="alert-actions">
                      <button
                        onClick={() =>
                          handleStatusChange(alert.id, "acknowledged")
                        }
                        className="alert-action-btn ack"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(alert.id, "escalated")
                        }
                        className="alert-action-btn esc"
                      >
                        Escalate
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(alert.id, "false_positive")
                        }
                        className="alert-action-btn fp"
                      >
                        False Positive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
