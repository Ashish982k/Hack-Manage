export interface Stage {
  id: string;
  title: string;
  type: "SUBMISSION" | "EVALUATION" | "FINAL";
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProblemStatement {
  id: string;
  title: string;
  description: string;
}

export type ScheduleType = "entry" | "breakfast" | "lunch" | "dinner";

export type ScheduleOption = {
  startTime: string;
  endTime: string;
};

export type ScheduleState = Record<ScheduleType, ScheduleOption>;
export type ScheduleEnabledState = Record<ScheduleType, boolean>;
