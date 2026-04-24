"use client";

import type * as React from "react";
import { Calendar as CalendarIcon, Image as ImageIcon, Info, MapPin, Upload } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BasicDetailsSectionProps = {
  title: string;
  onTitleChange: (value: string) => void;
  headerImage: File | null;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  location: string;
  onLocationChange: (value: string) => void;
  registrationDeadline: string;
  onRegistrationDeadlineChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
};

export function BasicDetailsSection({
  title,
  onTitleChange,
  headerImage,
  onImageChange,
  location,
  onLocationChange,
  registrationDeadline,
  onRegistrationDeadlineChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: BasicDetailsSectionProps) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-white/[0.07] backdrop-blur-xl">
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
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="e.g. CodeFest 2026"
            className="bg-white/[0.04] border-white/10 text-white focus-visible:ring-purple-500/40 rounded-xl"
            required
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-white/90">
            Header Image <span className="text-white/50">(Optional)</span>
          </label>
          <div className="relative flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.04] p-8 hover:bg-white/5 hover:border-white/30 transition">
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              accept="image/*"
              onChange={onImageChange}
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
              onChange={(event) => onLocationChange(event.target.value)}
              placeholder="e.g. Remote, or VJTI Mumbai"
              className="bg-white/[0.04] border-white/10 text-white focus-visible:ring-purple-500/40 rounded-xl"
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
              onChange={(event) => onRegistrationDeadlineChange(event.target.value)}
              className="bg-white/[0.04] border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
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
              onChange={(event) => onStartDateChange(event.target.value)}
              className="bg-white/[0.04] border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
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
              onChange={(event) => onEndDateChange(event.target.value)}
              className="bg-white/[0.04] border-white/10 text-white/80 focus-visible:ring-purple-500/40 rounded-xl [color-scheme:dark]"
              required
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
