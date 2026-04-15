"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Clock3,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  Info,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { MultiEmailInput } from "@/components/multi-email-input";
import { authClient } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/email-list";
import { createHackathon, saveHackathonSchedules } from "@/api";

function PageGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute left-1/2 top-[-140px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-blue-500/20 blur-3xl opacity-70" />
      <div className="absolute left-[-180px] top-[440px] h-[440px] w-[440px] rounded-full bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-pink-500/15 blur-3xl opacity-70" />
      <div className="absolute right-[-100px] bottom-[-200px] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 blur-3xl opacity-70" />
    </div>
  );
}

interface Stage {
  id: string;
  title: string;
  type: "SUBMISSION" | "EVALUATION" | "FINAL";
  startDate: string;
  endDate: string;
  description: string;
}

interface ProblemStatement {
  id: string;
  title: string;
  description: string;
}

type ScheduleType = "entry" | "breakfast" | "lunch" | "dinner";

type ScheduleOption = {
  startTime: string;
  endTime: string;
};

type ScheduleState = Record<ScheduleType, ScheduleOption>;

export default function CreateHackathonPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  // Basic Information
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  // Text Areas
  const [description, setDescription] = useState("");
  const [problemStatements, setProblemStatements] = useState<
    ProblemStatement[]
  >([
    {
      id: "1",
      title: "",
      description: "",
    },
  ]);

  const [headerImage, setHeaderImage] = useState<File | null>(null);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [judgeEmails, setJudgeEmails] = useState<string[]>([]);
  const [finalRoundSchedule, setFinalRoundSchedule] = useState<ScheduleState>({
    entry: { startTime: "", endTime: "" },
    breakfast: { startTime: "", endTime: "" },
    lunch: { startTime: "", endTime: "" },
    dinner: { startTime: "", endTime: "" },
  });

  const [stages, setStages] = useState<Stage[]>([
    {
      id: "1",
      title: "Registration & Idea Submission",
      type: "SUBMISSION",
      startDate: "",
      endDate: "",
      description: "",
    },
  ]);

  const handleAddStage = () => {
    setStages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: "",
        type: "SUBMISSION",
        startDate: "",
        endDate: "",
        description: "",
      },
    ]);
  };

  const handleRemoveStage = (id: string) => {
    setStages((current) => current.filter((stage) => stage.id !== id));
  };

  const updateStage = (id: string, field: keyof Stage, value: string) => {
    setStages((current) =>
      current.map((stage) =>
        stage.id === id ? { ...stage, [field]: value } : stage,
      ),
    );
  };

  const updateScheduleTime = (
    type: ScheduleType,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setFinalRoundSchedule((current) => ({
      ...current,
      [type]: {
        ...current[type],
        [field]: value,
      },
    }));
  };

  const handleAddProblemStatement = () => {
    setProblemStatements((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
      },
    ]);
  };

  const handleRemoveProblemStatement = (id: string) => {
    setProblemStatements((current) =>
      current.filter((statement) => statement.id !== id),
    );
  };

  const updateProblemStatement = (
    id: string,
    field: "title" | "description",
    value: string,
  ) => {
    setProblemStatements((current) =>
      current.map((statement) =>
        statement.id === id ? { ...statement, [field]: value } : statement,
      ),
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setHeaderImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const formData = new FormData();
    const creatorEmail = normalizeEmail(session?.user?.email ?? "");

    formData.append("title", title);
    formData.append("location", location);
    formData.append("startDate", startDate);
    formData.append("endDate", endDate);
    formData.append("registrationDeadline", registrationDeadline);
    formData.append("description", description);
    const formattedProblemStatements = problemStatements
      .map((statement) => ({
        title: statement.title.trim(),
        description: statement.description.trim(),
      }))
      .filter((statement) => statement.title.length > 0);

    formData.append(
      "problemStatements",
      JSON.stringify(formattedProblemStatements),
    );

    if (headerImage) {
      formData.append("headerImage", headerImage);
    }

    const formattedStages = stages.map((s) => ({
      title: s.title,
      type: s.type,
      startDate: s.startDate,
      endDate: s.endDate,
      description: s.description,
    }));

    formData.append("stages", JSON.stringify(formattedStages));
    const admins = Array.from(
      new Set(
        [...adminEmails.map(normalizeEmail), creatorEmail].filter(Boolean),
      ),
    );
    formData.append("admins", JSON.stringify(admins));
    const judges = Array.from(
      new Set(judgeEmails.map(normalizeEmail).filter(Boolean)),
    );
    formData.append("judges", JSON.stringify(judges));

    const requiredSchedules = (
      Object.entries(finalRoundSchedule) as Array<[ScheduleType, ScheduleOption]>
    )
      .map(([type, schedule]) => ({
        type,
        startTime: schedule.startTime.trim(),
        endTime: schedule.endTime.trim(),
      }));

    const missingSchedule = requiredSchedules.find(
      (schedule) => !schedule.startTime || !schedule.endTime,
    );
    if (missingSchedule) {
      alert(
        `Please provide both start and end date-time for ${missingSchedule.type}.`,
      );
      return;
    }

    const invalidRangeSchedule = requiredSchedules.find(
      (schedule) =>
        Number.isNaN(Date.parse(schedule.startTime)) ||
        Number.isNaN(Date.parse(schedule.endTime)) ||
        Date.parse(schedule.startTime) >= Date.parse(schedule.endTime),
    );
    if (invalidRangeSchedule) {
      alert(
        `${invalidRangeSchedule.type} start date-time must be before end date-time.`,
      );
      return;
    }

    try {
      const res = await createHackathon(formData);
      const data = (await res.json().catch(() => null)) as
        | { message?: string; hackathonId?: string }
        | null;

      if (res.ok) {
        const createdHackathonId = data?.hackathonId;
        if (!createdHackathonId) {
          alert("Hackathon created, but schedules could not be saved.");
          router.push("/hackathons");
          return;
        }

        const scheduleRes = await saveHackathonSchedules(createdHackathonId, {
          schedules: requiredSchedules.map((schedule) => ({
            type: schedule.type,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          })),
        });

        if (!scheduleRes.ok) {
          const scheduleData = (await scheduleRes.json().catch(() => null)) as
            | { message?: string }
            | null;
          alert(
            scheduleData?.message ||
              "Hackathon created, but schedules could not be saved.",
          );
          router.push("/hackathons");
          return;
        }

        alert("Hackathon created successfully!");
        router.push("/hackathons");
      } else {
        alert(data?.message || "Failed to create hackathon");
      }
    } catch (error) {
      console.error(error);
      alert("Network error");
    }
  };

  return (
    <div className="relative min-h-screen pb-20">
      <PageGlow />
      <Navbar />

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
        <button
          onClick={() => router.push(`/hackathons`)}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 transition hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathons
        </button>

        <div className="mb-10">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/15 to-blue-500/25 ring-1 ring-white/10 shadow-[0_0_30px_rgba(168,85,247,0.15)] mb-6">
            <Sparkles className="size-6 text-purple-200" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Create a Hackathon
          </h1>
          <p className="mt-3 text-lg text-white/60">
            Set up the basic details, timeline, and eligibility rules to launch
            your event.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: BASIC DETAILS */}
          <Card className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Info className="size-5 text-blue-400" />
                <CardTitle className="text-xl text-white font-semibold">
                  1. Basic Details
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/90">
                  Hackathon Title <span className="text-purple-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CodeFest 2026"
                  className="bg-black/20 border-white/10 text-white focus-visible:ring-purple-500/40 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/90">
                  Header Image <span className="text-white/50">(Optional)</span>
                </label>
                <div className="relative flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/20 p-8 hover:bg-white/5 hover:border-white/30 transition">
                  <input
                    type="file"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {headerImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="size-8 text-emerald-400" />
                      <p className="text-sm font-medium text-white">
                        {headerImage.name}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/50">
                      <Upload className="size-8" />
                      <p className="text-sm">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-white/30">
                        SVG, PNG, JPG or GIF (max. 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-white/90 flex items-center gap-2">
                    <MapPin className="size-4 text-white/50" />
                    Location
                  </label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Remote, or VJTI Mumbai"
                    className="bg-black/20 border-white/10 text-white focus-visible:ring-purple-500/40 rounded-xl"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-white/90 flex items-center gap-2">
                    <CalendarIcon className="size-4 text-white/50" />
                    Registration Deadline{" "}
                    <span className="text-purple-500">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-white/90 flex items-center gap-2">
                    <CalendarIcon className="size-4 text-white/50" />
                    Start Date <span className="text-purple-500">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-white/90 flex items-center gap-2">
                    <CalendarIcon className="size-4 text-white/50" />
                    End Date <span className="text-purple-500">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: STAGES & TIMELINES */}
          <Card className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <div className="flex border-b border-white/10 items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <Layers className="size-5 text-pink-400" />
                  <CardTitle className="text-xl text-white font-semibold">
                    2. Stages & Timelines
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="relative border-l border-white/10 ml-4 space-y-8 pb-4">
                {stages.map((stage) => (
                  <div key={stage.id} className="relative pl-8">
                    {/* Timeline Node */}
                    <span className="absolute -left-3 top-2 flex size-6 items-center justify-center rounded-full bg-black ring-2 ring-white/10">
                      <span className="size-2.5 rounded-full bg-pink-500" />
                    </span>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 relative group">
                      {stages.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveStage(stage.id)}
                          className="absolute right-3 top-3 px-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                            Stage Title
                          </label>
                          <Input
                            value={stage.title}
                            onChange={(e) =>
                              updateStage(stage.id, "title", e.target.value)
                            }
                            placeholder="e.g. Round 1 - Ideation Phase"
                            className="bg-black/20 border-white/10 text-white font-medium focus-visible:ring-pink-500/40 rounded-xl"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                            Stage Type
                          </label>
                          <select
                            value={stage.type}
                            onChange={(e) =>
                              updateStage(stage.id, "type", e.target.value)
                            }
                            className="block w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                          >
                            <option value="SUBMISSION">Submission</option>
                            <option value="EVALUATION">Evaluation</option>
                            <option value="FINAL">Final</option>
                          </select>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                              Start Time
                            </label>
                            <Input
                              type="datetime-local"
                              value={stage.startDate}
                              onChange={(e) =>
                                updateStage(
                                  stage.id,
                                  "startDate",
                                  e.target.value,
                                )
                              }
                              className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-pink-500/40 rounded-xl [color-scheme:dark]"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                              End Time
                            </label>
                            <Input
                              type="datetime-local"
                              value={stage.endDate}
                              onChange={(e) =>
                                updateStage(stage.id, "endDate", e.target.value)
                              }
                              className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-pink-500/40 rounded-xl [color-scheme:dark]"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                            Description
                          </label>
                          <textarea
                            value={stage.description}
                            onChange={(e) =>
                              updateStage(
                                stage.id,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Detail what participants need to do in this stage..."
                            className="block w-full min-h-20 resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500/40"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pl-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddStage}
                  className="rounded-xl border-dashed border-white/20 text-white/70 hover:text-white"
                >
                  <Plus className="mr-2 size-4" />
                  Add Another Stage
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: FINAL ROUND SCHEDULE */} 
          <Card className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Clock3 className="size-5 text-amber-300" />
                <CardTitle className="text-xl font-semibold text-white">
                  3. Final Round Schedule
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <p className="text-sm text-white/60">
                Set start and end date-time for all final round checkpoints.
                These values are stored for entry, breakfast, lunch, and dinner.
              </p>

              {(
                [
                  { key: "entry", label: "Entry" },
                  { key: "breakfast", label: "Breakfast" },
                  { key: "lunch", label: "Lunch" },
                  { key: "dinner", label: "Dinner" },
                ] as const
              ).map((item) => {
                const config = finalRoundSchedule[item.key];
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-semibold text-white/90">
                      {item.label}
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
                          Start Date & Time <span className="text-purple-400">*</span>
                        </label>
                        <Input
                          type="datetime-local"
                          value={config.startTime}
                          onChange={(e) =>
                            updateScheduleTime(
                              item.key,
                              "startTime",
                              e.target.value,
                            )
                          }
                          className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">
                          End Date & Time <span className="text-purple-400">*</span>
                        </label>
                        <Input
                          type="datetime-local"
                          value={config.endTime}
                          onChange={(e) =>
                            updateScheduleTime(item.key, "endTime", e.target.value)
                          }
                          className="bg-black/20 border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* SECTION 4: HACKATHON ACCESS / ROLES */}
          <Card className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
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
                onChange={setAdminEmails}
                placeholder="admin@example.com"
                helperText="Press Enter, comma, or Tab to add each email."
              />

              <MultiEmailInput
                label="Judge Emails"
                emails={judgeEmails}
                onChange={setJudgeEmails}
                placeholder="judge@example.com"
                helperText="Add one or more judge email IDs."
              />
            </CardContent>
          </Card>

          {/* SECTION 5: HACKATHON INFORMATION */}
          <Card className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <FileText className="size-5 text-purple-400" />
                  <CardTitle className="text-xl font-semibold text-white">
                    5. Problem Statements & Details
                  </CardTitle>
                </div>
              </CardHeader>
            <CardContent className="pt-2">
              <p className="mb-4 text-sm text-white/60">
                Add one or more problem statements, then describe the hackathon
                context and expectations.
              </p>
              <div className="relative border-l border-white/10 ml-4 space-y-8 pb-4">
                {problemStatements.map((statement, index) => (
                  <div key={statement.id} className="relative pl-8">
                    <span className="absolute -left-3 top-2 flex size-6 items-center justify-center rounded-full bg-black ring-2 ring-white/10">
                      <span className="size-2.5 rounded-full bg-purple-500" />
                    </span>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 relative group">
                      {problemStatements.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            handleRemoveProblemStatement(statement.id)
                          }
                          className="absolute right-3 top-3 px-2 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                            Problem Statement {index + 1}
                          </label>
                          <Input
                            value={statement.title}
                            onChange={(e) =>
                              updateProblemStatement(
                                statement.id,
                                "title",
                                e.target.value,
                              )
                            }
                            placeholder="e.g. Build an AI tutor for campus support"
                            className="bg-black/20 border-white/10 text-white font-medium focus-visible:ring-purple-500/40 rounded-xl"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-white/50 mb-1.5 block uppercase tracking-wider">
                            Description{" "}
                            <span className="text-white/30">(Optional)</span>
                          </label>
                          <textarea
                            value={statement.description}
                            onChange={(e) =>
                              updateProblemStatement(
                                statement.id,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Add extra context, constraints, or goals for this statement..."
                            className="block w-full min-h-24 resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pl-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddProblemStatement}
                  className="rounded-xl border-dashed border-white/20 text-white/70 hover:text-white"
                >
                  <Plus className="mr-2 size-4" />
                  Add Another Problem Statement
                </Button>
              </div>

              <p className="mb-4 mt-6 text-sm text-white/60">
                Provide a complete overview of the hackathon, including rules,
                themes, resources, and contact information.
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include background context, expected deliverables, and marking criteria..."
                className="block min-h-48 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </CardContent>
          </Card>

          {/* SUBMIT BUTTON */}
          <div className="pt-8 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:w-auto h-14 px-10 text-lg font-semibold shadow-[0_0_40px_rgba(168,85,247,0.3)] hover:shadow-[0_0_60px_rgba(168,85,247,0.4)] transition-all duration-300 rounded-2xl"
            >
              <Sparkles className="mr-2 size-5" />
              Publish Hackathon
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
