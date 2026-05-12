"use client";

import React, { useState } from "react";
import {
  IntroWithIcon,
  SettingsShell,
  ToggleRow,
} from "@/app/org/settings/_components/SettingsScaffold";
import { Bell } from "lucide-react";

export default function NotificationsSettingsPage() {
  const [alerts, setAlerts] = useState([
    { id: 1, on: true },
    { id: 2, on: true },
    { id: 3, on: false },
    { id: 4, on: false },
    { id: 5, on: false },
    { id: 6, on: true },
    { id: 7, on: true },
  ]);

  const toggleAlert = (index: number) => {
    setAlerts((current) =>
      current.map((item, i) =>
        i === index ? { ...item, on: !item.on } : item,
      ),
    );
  };

  return (
    <SettingsShell title="Notifications">
      <IntroWithIcon
        icon={Bell}
        title="Stay Updated"
        subtitle="Choose which notifications you want to receive"
      />
      <div className="flex flex-col gap-3">
        {alerts.map((alert, index) => (
          <ToggleRow
            key={alert.id}
            label="Tournament Alerts"
            subtitle="Get notified about new tournaments"
            on={alert.on}
            onToggle={() => toggleAlert(index)}
          />
        ))}
      </div>
    </SettingsShell>
  );
}
