"use client";

import { Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiEmailInput } from "@/components/multi-email-input";

type AccessRolesSectionProps = {
  adminEmails: string[];
  onAdminEmailsChange: (emails: string[]) => void;
  judgeEmails: string[];
  onJudgeEmailsChange: (emails: string[]) => void;
};

export function AccessRolesSection({
  adminEmails,
  onAdminEmailsChange,
  judgeEmails,
  onJudgeEmailsChange,
}: AccessRolesSectionProps) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-white/[0.07] backdrop-blur-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Users className="size-5 text-emerald-400" />
          <CardTitle className="text-xl font-semibold text-white">
            4. Hackathon Access / Roles
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <p className="text-sm text-white/60">
          Add users who can help manage and evaluate this hackathon. Your
          account is automatically included as an admin.
        </p>

        <MultiEmailInput
          label="Admin Emails"
          emails={adminEmails}
          onChange={onAdminEmailsChange}
          placeholder="admin@example.com"
          helperText="Press Enter, comma, or Tab to add each email."
        />

        <MultiEmailInput
          label="Judge Emails"
          emails={judgeEmails}
          onChange={onJudgeEmailsChange}
          placeholder="judge@example.com"
          helperText="Add one or more judge email IDs."
        />
      </CardContent>
    </Card>
  );
}
