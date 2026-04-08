# Hackathon Platform Refactor - Auto-Create Team on Join

## Summary
Successfully refactored the hackathon platform so that **joining a hackathon automatically creates a team**. Users no longer need to manually create a team after joining.

---

## Backend Changes

### 1. `POST /hackathons/:id/join` (joinHackathon)
**Location:** `backend/controllers/Hackathon.ts`

**New Behavior:**
- Gets `userId` from session (secure - doesn't trust frontend)
- Gets `hackathonId` from URL params

**Steps:**
1. **Check if user already in team:** Queries `teamMembers` joined with `teams`
   - If found → Returns `409 Conflict` with message "Already joined this hackathon"

2. **Validate hackathon exists:**
   - If not found → Returns `404 Not Found`

3. **Create new team:**
   - `id`: Random UUID
   - `hackathonId`: From params
   - `leaderId`: Current userId
   - `name`: "My Team" (default)

4. **Add user to team:**
   - Inserts into `teamMembers` with random UUID
   - Sets `status: "approved"` (team leader is auto-approved)

5. **Return success:**
   - Returns `201 Created` with "Successfully joined hackathon"

**HTTP Status Codes:**
- `201` - Team created and user joined successfully
- `409` - User already joined this hackathon
- `404` - Hackathon not found
- `500` - Server error

---

### 2. `DELETE /hackathons/:id/join` (deleteUser)
**Location:** `backend/controllers/Hackathon.ts`

**New Behavior:**
- Finds user's team for the specific hackathon
- Uses team.id for deletion (NOT leaderId globally)

**Cases:**
1. **User not in team:** Returns `404 Not Found`

2. **User is team leader:**
   - Deletes the entire team using `eq(teams.id, member.team.id)`
   - Cascade deletes submissions automatically via database schema

3. **User is regular member:**
   - Removes only that user from `teamMembers`

**HTTP Status Codes:**
- `200` - Successfully left hackathon
- `404` - User not part of any team
- `500` - Server error

---

### 3. `GET /hackathons/:id/team` (getMember)
**Location:** `backend/controllers/Hackathon.ts`

**New Behavior:**
- Simplified error handling
- Returns proper 404 when user not in team

**Response:**
- **404** if user not in any team for this hackathon
- **200** with team data if team exists:
  ```json
  {
    "teamId": "uuid",
    "name": "My Team",
    "leaderId": "user-id",
    "members": [...],
    "submission": {...} or null
  }
  ```

---

## Frontend Changes

### 1. Updated `handleJoin` Function
**Location:** `frontend/src/app/hackathons/[id]/page.tsx`

**Changes:**
- ✅ Calls `POST` if not joined, `DELETE` if joined
- ✅ Parses response and displays appropriate toast message
- ✅ Always calls `fetchTeam()` on success to update UI state
- ❌ **REMOVED:** Redirect to `/create-team` page
- ✅ Displays error message from backend on failure

**Before:**
```typescript
if (data.error === "Not found") {
  router.push(`/hackathons/${hackathonId}/create-team`);
  return;
}
```

**After:**
```typescript
if (!res.ok) {
  setToast({
    kind: "error",
    title: data.message || "Something went wrong",
  });
  return;
}
```

---

### 2. `fetchTeam` Function
**Location:** `frontend/src/app/hackathons/[id]/page.tsx`

**Behavior (Already Correct):**
- ✅ If response is `200` → `setIsJoined(true)`
- ✅ If response is `404` → `setIsJoined(false)`
- ✅ Does NOT manually set isJoined anywhere else
- ✅ Backend is source of truth

---

### 3. Team Section UI Update
**Location:** `frontend/src/app/hackathons/[id]/page.tsx`

**Changes:**
- ❌ **REMOVED:** "Create Team" button
- ✅ Updated message when no team: "Join the hackathon to automatically create your team."

**Before:**
```tsx
<Button onClick={() => router.push(`/hackathons/${hackathonId}/create-team`)}>
  Create Team
</Button>
```

**After:**
```tsx
<div className="flex flex-col items-center justify-center py-6 text-center">
  <p className="text-sm font-semibold text-white/90">No team yet</p>
  <p className="mt-1 text-sm text-white/60">
    Join the hackathon to automatically create your team.
  </p>
</div>
```

---

### 4. Join/Leave Button (Already Correct)
**Location:** `frontend/src/app/hackathons/[id]/page.tsx`

**Behavior:**
- ✅ Shows "Join Hackathon" when `isJoined === false`
- ✅ Shows "Leave Hackathon" when `isJoined === true`
- ✅ State is derived from backend via `fetchTeam()`

```tsx
<Button
  variant={isJoined ? "outline" : "primary"}
  onClick={handleJoin}
>
  {isJoined ? "Leave Hackathon" : "Join Hackathon"}
</Button>
```

---

## Expected User Flow

### Joining a Hackathon:
1. User clicks **"Join Hackathon"** button
2. Frontend sends `POST /hackathons/:id/join`
3. Backend creates team with name "My Team" and user as leader
4. Backend returns `201 Created`
5. Frontend calls `fetchTeam()`
6. Frontend receives team data (200)
7. UI updates: `isJoined = true`, button shows "Leave Hackathon"
8. Team section displays team info

### Leaving a Hackathon:
1. User clicks **"Leave Hackathon"** button
2. Frontend sends `DELETE /hackathons/:id/join`
3. Backend checks if user is leader:
   - **Leader:** Deletes entire team (cascade deletes submissions)
   - **Member:** Removes user from teamMembers
4. Backend returns `200 OK`
5. Frontend calls `fetchTeam()`
6. Frontend receives `404 Not Found`
7. UI updates: `isJoined = false`, button shows "Join Hackathon"
8. Team section shows "No team yet"

---

## Security & Best Practices

✅ **Backend is source of truth** - All state derived from API responses
✅ **No trust in frontend** - userId comes from session, not request body
✅ **Proper HTTP status codes:**
  - `201` - Resource created
  - `409` - Conflict (already joined)
  - `404` - Not found
  - `401` - Unauthorized
  - `200` - Success

✅ **Proper deletion logic** - Only deletes using `team.id`, not `leaderId` globally
✅ **Database cascade** - Submissions auto-deleted when team is deleted
✅ **No manual state setting** - `isJoined` derived from `fetchTeam()` response

---

## Files Modified

### Backend:
- `backend/controllers/Hackathon.ts` (3 functions updated)
  - `joinHackathon` - Completely rewritten
  - `deleteUser` - Fixed deletion logic
  - `getMember` - Simplified error handling

### Frontend:
- `frontend/src/app/hackathons/[id]/page.tsx`
  - `handleJoin` - Removed redirect to create-team
  - Team section UI - Removed "Create Team" button

---

## Testing Checklist

- [ ] User can join hackathon (creates team automatically)
- [ ] User sees "Leave Hackathon" after joining
- [ ] Team appears in Team section after joining
- [ ] User cannot join same hackathon twice (409 error)
- [ ] Leader leaving deletes entire team
- [ ] Member leaving removes only themselves
- [ ] Submissions deleted when leader leaves
- [ ] UI updates correctly after join/leave
- [ ] Error messages display correctly
- [ ] 404 when hackathon doesn't exist

---

## Notes

- Default team name is "My Team" - can be customized later via team management
- The `/create-team` page still exists but is no longer used in this flow
- Team creation is now implicit when joining a hackathon
- Team leader (creator) is automatically set to `status: "approved"` in teamMembers
