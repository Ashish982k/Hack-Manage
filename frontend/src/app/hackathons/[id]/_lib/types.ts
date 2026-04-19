export type SubmissionStatus = "Not submitted" | "Submitted" | "Under review";
export type StageType = "SUBMISSION" | "EVALUATION" | "FINAL";

export type StageInfo = {
  id: string;
  title: string;
  type: StageType;
  startTime: string | null;
  endTime: string | null;
};

export type TeamMember = {
  id: string;
  userId: string;
  status: "pending" | "approved";
  name: string;
  role: "Leader" | "Member";
};

export type TeamInfo = {
  id: string;
  name: string;
  leaderId: string;
  members: TeamMember[];
  submission: {
    id: string;
    pptUrl: string | null;
    githubUrl: string | null;
    problemStatementId: string | null;
    submittedAt: string;
    evaluated?: boolean;
    scoreBreakdown?: {
      technical: number;
      feasibility: number;
      innovation: number;
      presentation: number;
      impact: number;
      totalScore: number;
      evaluationCount: number;
    } | null;
  } | null;
};

export type TeamStateResponse = {
  joined: boolean;
  team: {
    id: string;
    name: string;
    leaderId: string;
    members: Array<{
      id: string;
      userId: string;
      status: "pending" | "approved";
      user?: {
        id: string;
        name: string;
      };
    }>;
    submission: {
      id: string;
      pptUrl: string | null;
      githubUrl: string | null;
      problemStatementId: string | null;
      submittedAt: string;
      evaluated?: boolean;
      scoreBreakdown?: {
        technical: number;
        feasibility: number;
        innovation: number;
        presentation: number;
        impact: number;
        totalScore: number;
        evaluationCount: number;
      } | null;
    } | null;
  } | null;
};

export type ApiMessageResponse = {
  message?: string;
};

export type JudgeAccessResponse = {
  isJudge: boolean;
  isAdmin?: boolean;
};

export type ShortlistedTeamsResponse = {
  data?: Array<{
    teamId?: string;
  }>;
};

export type ProblemStatement = {
  id: string;
  title: string;
  body: string;
};

export type LeaderboardTeam = {
  teamId: string;
  teamName: string;
  totalScore: number;
  technical: number;
  feasibility: number;
  innovation: number;
  presentation: number;
  impact: number;
  evaluationCount: number;
};

export type HackathonApiResponse = {
  id: string;
  title: string;
  description: string;
  headerImg?: string;
  location?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  createdBy: string;
  problemStatements?: ProblemStatement[];
  stages?: StageInfo[];
};

export type HackathonViewModel = HackathonApiResponse & {
  shortDescription: string;
  longDescription: string;
  status: "Open" | "Closed";
  submissionDeadline: string;
  finalRoundDate: string;
  tags: string[];
  rules: string[];
};

export type ToastState = {
  kind: "success" | "error";
  title: string;
  message?: string;
} | null;

export type ScheduleItem = {
  label: string;
  badge: string;
  date: string;
  time: string;
  active: boolean;
};
