"use client";

import React from "react";
import {
  HelpCard,
  SettingsShell,
} from "../_components/SettingsScaffold";

export default function OrgHelpPage() {
  return (
    <SettingsShell title="Help & Support">
      <HelpCard type="org" />
    </SettingsShell>
  );
}

