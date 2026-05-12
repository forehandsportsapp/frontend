"use client";

import React, { useState } from "react";
import {
  IntroWithIcon,
  SettingsShell,
  ToggleRow,
} from "../_components/SettingsScaffold";
import { Bell, Settings2 } from "lucide-react";

export default function OrgNotificationsPage() {
  const [toggles, setToggles] = useState([
    true,
    true,
    false,
    false,
    false,
    true,
    true,
  ]);

  const updateToggle = (index: number) => {
    setToggles((current) =>
      current.map((value, currentIndex) =>
        currentIndex === index ? !value : value,
      ),
    );
  };

  return (
    <SettingsShell title="Notifications">
      <IntroWithIcon
        icon={Bell as any}
        title="Stay Updated"
        subtitle="Choose which notifications you want to receive"
      />

      <div className="flex flex-col gap-3">
        {toggles.map((on, index) => (
          <ToggleRow
            key={index}
            label="Tournament Alerts"
            subtitle="Get notified about new tournaments"
            on={on}
            onToggle={() => updateToggle(index)}
          />
        ))}
      </div>
    </SettingsShell>
  );
}
