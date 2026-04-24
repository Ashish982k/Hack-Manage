"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { authClient } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/email-list";
import { createHackathon, saveHackathonSchedules } from "@/api";

import { AccessRolesSection } from "./_components/access-roles-section";
import { BasicDetailsSection } from "./_components/basic-details-section";
import { FinalRoundScheduleSection } from "./_components/final-round-schedule-section";
import { PageGlow } from "./_components/page-glow";
import { ProblemDetailsSection } from "./_components/problem-details-section";
import { StagesSection } from "./_components/stages-section";
import type {
  ProblemStatement,
  ScheduleEnabledState,
  ScheduleOption,
  ScheduleState,
  ScheduleType,
  Stage,
} from "./_lib/types";

export default function CreateHackathonPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [title, setTitle] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [registrationDeadline, setRegistrationDeadline] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [problemStatements, setProblemStatements] = React.useState<
    ProblemStatement[]
  >([
    {
      id: "1",
      title: "",
      description: "",
    },
  ]);

  const [headerImage, setHeaderImage] = React.useState<File | null>(null);
  const [adminEmails, setAdminEmails] = React.useState<string[]>([]);
  const [judgeEmails, setJudgeEmails] = React.useState<string[]>([]);
  const [finalRoundSchedule, setFinalRoundSchedule] = React.useState<ScheduleState>({
    entry: { startTime: "", endTime: "" },
    breakfast: { startTime: "", endTime: "" },
    lunch: { startTime: "", endTime: "" },
    dinner: { startTime: "", endTime: "" },
  });
  const [enabledSchedules, setEnabledSchedules] =
    React.useState<ScheduleEnabledState>({
      entry: true,
      breakfast: false,
      lunch: false,
      dinner: false,
    });

  const [stages, setStages] = React.useState<Stage[]>([
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

  const toggleSchedule = (type: Exclude<ScheduleType, "entry">) => {
    setEnabledSchedules((current) => {
      const nextEnabled = !current[type];

      if (!nextEnabled) {
        setFinalRoundSchedule((schedule) => ({
          ...schedule,
          [type]: { startTime: "", endTime: "" },
        }));
      }

      return {
        ...current,
        [type]: nextEnabled,
      };
    });
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setHeaderImage(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();

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

    const formattedStages = stages.map((stage) => ({
      title: stage.title,
      type: stage.type,
      startDate: stage.startDate,
      endDate: stage.endDate,
      description: stage.description,
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

    const normalizedSchedules = (
      Object.entries(finalRoundSchedule) as Array<[ScheduleType, ScheduleOption]>
    ).map(([type, schedule]) => ({
      type,
      startTime: schedule.startTime.trim(),
      endTime: schedule.endTime.trim(),
    }));

    const entrySchedule = normalizedSchedules.find(
      (schedule) => schedule.type === "entry",
    );
    if (!entrySchedule || !entrySchedule.startTime || !entrySchedule.endTime) {
      alert("Please provide both start and end date-time for entry.");
      return;
    }

    const enabledOptionalTypes = (
      Object.entries(enabledSchedules) as Array<[ScheduleType, boolean]>
    )
      .filter(([type, enabled]) => type !== "entry" && enabled)
      .map(([type]) => type);

    const missingOptionalSchedule = normalizedSchedules.find(
      (schedule) =>
        enabledOptionalTypes.includes(schedule.type) &&
        (!schedule.startTime || !schedule.endTime),
    );
    if (missingOptionalSchedule) {
      alert(
        `Please provide both start and end date-time for ${missingOptionalSchedule.type}.`,
      );
      return;
    }

    const schedulesToValidate = normalizedSchedules.filter(
      (schedule) =>
        schedule.type === "entry" || enabledOptionalTypes.includes(schedule.type),
    );

    const invalidRangeSchedule = schedulesToValidate.find(
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

    const schedulesToSave = normalizedSchedules.filter(
      (schedule) =>
        schedule.type === "entry" || enabledOptionalTypes.includes(schedule.type),
    );

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
          schedules: schedulesToSave.map((schedule) => ({
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
          onClick={() => router.push("/hackathons")}
          className="mb-8 flex items-center gap-2 text-sm text-white/50 transition hover:text-white/80"
        >
          <ArrowLeft className="size-4" />
          Back to Hackathons
        </button>

        <div className="mb-10">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/25 via-pink-500/15 to-blue-500/18 ring-1 ring-white/10 shadow-[0_0_30px_rgba(168,85,247,0.15)] mb-6">
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
          <BasicDetailsSection
            title={title}
            onTitleChange={setTitle}
            headerImage={headerImage}
            onImageChange={handleImageChange}
            location={location}
            onLocationChange={setLocation}
            registrationDeadline={registrationDeadline}
            onRegistrationDeadlineChange={setRegistrationDeadline}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
          />

          <StagesSection
            stages={stages}
            onAddStage={handleAddStage}
            onRemoveStage={handleRemoveStage}
            onUpdateStage={updateStage}
          />

          <FinalRoundScheduleSection
            finalRoundSchedule={finalRoundSchedule}
            enabledSchedules={enabledSchedules}
            onToggleSchedule={toggleSchedule}
            onUpdateScheduleTime={updateScheduleTime}
          />

          <AccessRolesSection
            adminEmails={adminEmails}
            onAdminEmailsChange={setAdminEmails}
            judgeEmails={judgeEmails}
            onJudgeEmailsChange={setJudgeEmails}
          />

          <ProblemDetailsSection
            problemStatements={problemStatements}
            onAddProblemStatement={handleAddProblemStatement}
            onRemoveProblemStatement={handleRemoveProblemStatement}
            onUpdateProblemStatement={updateProblemStatement}
            description={description}
            onDescriptionChange={setDescription}
          />

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
