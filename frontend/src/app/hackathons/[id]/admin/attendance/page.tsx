"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { fetchHackathonAttendance } from "@/api";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AttendanceType = "entry" | "breakfast" | "lunch" | "dinner";

type AttendanceRecord = {
  userId: string;
  teamId: string;
  type: AttendanceType;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
};

const ATTENDANCE_TYPES: AttendanceType[] = [
  "entry",
  "breakfast",
  "lunch",
  "dinner",
];

const TYPE_LABELS: Record<AttendanceType, string> = {
  entry: "Entry",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const isAttendanceType = (value: unknown): value is AttendanceType =>
  value === "entry" ||
  value === "breakfast" ||
  value === "lunch" ||
  value === "dinner";

const isAttendanceRecord = (value: unknown): value is AttendanceRecord => {
  if (typeof value !== "object" || value === null) return false;

  const row = value as Record<string, unknown>;
  return (
    typeof row.userId === "string" &&
    typeof row.teamId === "string" &&
    isAttendanceType(row.type) &&
    typeof row.isUsed === "boolean" &&
    typeof row.expiresAt === "string" &&
    typeof row.createdAt === "string"
  );
};

const readAttendanceData = (value: unknown): AttendanceRecord[] => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("data" in value) ||
    !Array.isArray((value as { data?: unknown }).data)
  ) {
    return [];
  }

  return (value as { data: unknown[] }).data.filter(isAttendanceRecord);
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export default function AttendanceDashboardPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();
  const hackathonId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([]);

  const groupedAttendance = React.useMemo(
    () =>
      attendance.reduce<Record<AttendanceType, AttendanceRecord[]>>(
        (acc, row) => {
          acc[row.type].push(row);
          return acc;
        },
        { entry: [], breakfast: [], lunch: [], dinner: [] },
      ),
    [attendance],
  );

  const loadAttendance = React.useCallback(async () => {
    if (!hackathonId) {
      setError("Failed to fetch attendance data");
      setAttendance([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchHackathonAttendance(hackathonId);
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setAttendance([]);
        if (res.status === 401 || res.status === 403) {
          setError("You are not authorized to view this page");
          return;
        }
        setError("Failed to fetch attendance data");
        return;
      }

      setAttendance(readAttendanceData(data));
    } catch {
      setAttendance([]);
      setError("Failed to fetch attendance data");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  React.useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  return (
    <div className="relative min-h-screen premium-page text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons/${hackathonId}`)}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathon
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Attendance Dashboard
          </h1>
          <p className="mt-3 text-sm text-white/60 sm:text-base">
            Track QR usage for entry and meal attendance.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center py-12 text-white/70">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading attendance...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Unable to load attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-rose-300">{error}</p>
              <Button variant="outline" onClick={() => void loadAttendance()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : attendance.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-sm text-white/70">
              No attendance data available
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {ATTENDANCE_TYPES.map((type) => {
              const rows = groupedAttendance[type];

              return (
                <Card key={type}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between gap-2 text-white">
                      <span>{TYPE_LABELS[type]}</span>
                      <Badge className="bg-white/10 text-white/75 ring-white/15">
                        {rows.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rows.length === 0 ? (
                      <p className="text-sm text-white/60">
                        No attendance records for this section.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/60">
                              <th className="px-4 py-3">User ID</th>
                              <th className="px-4 py-3">Team ID</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Expiry Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, index) => (
                              <tr
                                key={`${row.userId}-${row.teamId}-${row.type}-${row.createdAt}-${index}`}
                                className="border-b border-white/10"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-white/85">
                                  {row.userId}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-white/85">
                                  {row.teamId}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={
                                      row.isUsed
                                        ? "text-sm font-semibold text-emerald-300"
                                        : "text-sm font-semibold text-rose-300"
                                    }
                                  >
                                    {row.isUsed ? "Used" : "Not Used"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-white/75">
                                  {formatDateTime(row.expiresAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

