# Hackathon Join Flow - Updated Implementation

## Summary
Updated the hackathon platform so that **clicking "Join Hackathon" redirects to a team creation page** where users can enter their team name and add team members by email.

---

## User Flow

### Joining a Hackathon:
1. User clicks **"Join Hackathon"** button
2. Frontend sends `POST /hackathons/:id/join` to validate eligibility
3. Backend checks:
   - User not already in a team for this hackathon
   - Hackathon exists
4. If valid → Frontend redirects to `/hackathons/:id/create-team`
5. User enters:
   - **Team Name** (required)
   - **Team Member Emails** (optional)
6. Frontend validates each email exists in database
7. Backend creates team with user as leader
8. Redirect back to hackathon page with team created

### Leaving a Hackathon:
1. User clicks **"Leave Hackathon"** button
2. Frontend sends `DELETE /hackathons/:id/join`
3. Backend checks if user is leader or member
4. Deletes team (if leader) or removes user (if member)
5. UI updates to show "Join Hackathon" again

---

## Backend Changes

### 1. `POST /hackathons/:id/join` (Validation Only)
**Location:** `backend/controllers/Hackathon.ts`

**New Behavior:**
- ✅ Gets `userId` from session (secure)
- ✅ Checks if user already in a team for this hackathon → 409 if yes
- ✅ Validates hackathon exists → 404 if not
- ✅ Returns 200 with `redirect: true` flag if user can proceed
- ❌ **Does NOT create team** (that happens in createTeam)

**Response:**
```json
{
  "message": "Ready to create team",
  "redirect": true
}
```

**HTTP Status Codes:**
- `200` - User can proceed to create team
- `409` - Already joined this hackathon
- `404` - Hackathon not found
- `500` - Server error

---

### 2. `POST /teams` (createTeam)
**Location:** `backend/controllers/Hackathon.ts`

**Behavior:**
- ✅ Receives: `hackathonId`, `teamName`, `members` (array of emails)
- ✅ Validates hackathon exists
- ✅ Checks user not already in a team for this hackathon
- ✅ Creates team with user as `leaderId`
- ✅ Adds creator to teamMembers with `status: "approved"`
- ✅ For each member email:
  - Looks up user in database
  - Returns `400` if user not found with message: "User with email {email} is not registered or verified"
  - Adds user to teamMembers with `status: "pending"`
  - Skips if email matches team leader
- ✅ Returns success with teamId

**HTTP Status Codes:**
- `200` - Team created successfully
- `400` - Invalid data or user email not found
- `500` - Server error

---

### 3. `DELETE /hackathons/:id/join` (Unchanged)
**Location:** `backend/controllers/Hackathon.ts`

**Behavior:**
- Same as before
- Deletes entire team if user is leader
- Removes user from teamMembers if regular member

---

### 4. `GET /hackathons/:id/team` (Unchanged)
**Location:** `backend/controllers/Hackathon.ts`

**Behavior:**
- Returns team data if user is in a team
- Returns 404 if not

---

## Frontend Changes

### 1. `handleJoin` Function
**Location:** `frontend/src/app/hackathons/[id]/page.tsx`

**New Logic:**

**If user is already joined (isJoined = true):**
- Sends `DELETE` request
- Shows "Left the hackathon" toast
- Calls `fetchTeam()` to update UI

**If user is not joined (isJoined = false):**
- Sends `POST` request to validate eligibility
- If successful → **Redirects to `/hackathons/:id/create-team`**
- If error (409 already joined, 404 not found) → Shows error toast

```typescript
// If not joined, check eligibility then redirect to create team
const res = await fetch(
  `http://localhost:5000/hackathons/${hackathonId}/join`,
  { method: "POST", credentials: "include" }
);

if (res.ok) {
  router.push(`/hackathons/${hackathonId}/create-team`);
}
```

---

### 2. Create Team Page
**Location:** `frontend/src/app/hackathons/[id]/create-team/page.tsx`

**Features:**
- ✅ Team Name input (required)
- ✅ Shows message: "You will be assigned as the team leader"
- ✅ Team Members input (optional, up to 5 members)
- ✅ Shows message: "Add team members by their registered email addresses"
- ✅ Add/Remove member inputs dynamically
- ✅ Email validation (checks if user exists in database)
- ✅ Better error message: "User with email {email} is not registered or verified. Please ask them to sign up first."
- ✅ Can create team with just leader (no members required)
- ✅ Redirects back to hackathon page after successful creation

**Validation Flow:**
1. Check team name is not empty
2. For each member email entered:
   - Validate email format
   - Call `GET /users/check?email={email}`
   - If user doesn't exist → Show error and stop
3. If all valid → Send to `POST /teams`
4. On success → Redirect to hackathon page

---

### 3. Team Section UI
**Location:** `frontend/src/app/hackathons/[id]/page.tsx`

**When no team:**
```tsx
<p>No team yet</p>
<p>Click "Join Hackathon" to create your team.</p>
```

---

## Team Member Status

### Leader:
- User who creates the team
- Set as `leaderId` in teams table
- Added to teamMembers with `status: "approved"`
- Can delete entire team by leaving

### Regular Members:
- Added via email during team creation
- Added to teamMembers with `status: "pending"`
- Can leave team individually without deleting it

---

## Security Features

✅ **Backend validates everything:**
- User must be authenticated (from session)
- Cannot join same hackathon twice
- Hackathon must exist
- Team member emails must exist in database

✅ **Frontend validates before backend:**
- Email format validation
- Check user exists via API
- Better UX with immediate feedback

✅ **No trust in frontend:**
- userId comes from session
- All validations repeated on backend

---

## Files Modified

### Backend:
- `backend/controllers/Hackathon.ts`
  - `joinHackathon` - Changed to validation-only endpoint
  - `createTeam` - Updated to set leader as "approved", better error messages

### Frontend:
- `frontend/src/app/hackathons/[id]/page.tsx`
  - `handleJoin` - Added redirect to create-team page
  - Team section message updated
  
- `frontend/src/app/hackathons/[id]/create-team/page.tsx`
  - Updated labels and help text
  - Made members optional
  - Better error messages
  - Shows leader assignment message

---

## Example API Flows

### Successful Join Flow:

1. **Check eligibility:**
```bash
POST /hackathons/123/join
Response: 200
{
  "message": "Ready to create team",
  "redirect": true
}
```

2. **User fills out form and creates team:**
```bash
POST /teams
Body: {
  "hackathonId": "123",
  "teamName": "Awesome Team",
  "members": ["member1@example.com", "member2@example.com"]
}
Response: 200
{
  "message": "Team created successfully",
  "teamId": "uuid-here"
}
```

3. **Database state:**
```
teams:
  - id: uuid-here
  - hackathonId: 123
  - name: Awesome Team
  - leaderId: current-user-id

teamMembers:
  - teamId: uuid-here, userId: current-user-id, status: approved
  - teamId: uuid-here, userId: member1-id, status: pending
  - teamId: uuid-here, userId: member2-id, status: pending
```

### Error Cases:

**Already in team:**
```bash
POST /hackathons/123/join
Response: 409
{
  "message": "Already joined this hackathon"
}
```

**Email not registered:**
```bash
POST /teams
Body: {
  "hackathonId": "123",
  "teamName": "Test",
  "members": ["nonexistent@example.com"]
}
Response: 400
{
  "message": "User with email nonexistent@example.com is not registered or verified"
}
```

---

## Testing Checklist

- [ ] User clicks "Join Hackathon" → Redirects to create-team page
- [ ] Can create team with just name (no members)
- [ ] Can add up to 5 members
- [ ] Email validation shows error for invalid format
- [ ] Shows error if email not registered
- [ ] Team created with user as leader (status: approved)
- [ ] Members added with status: pending
- [ ] Cannot join same hackathon twice
- [ ] Leader leaving deletes entire team
- [ ] Member leaving removes only themselves
- [ ] UI updates correctly after team creation
- [ ] Redirect back to hackathon page works
- [ ] Error messages display correctly

---

## Notes

- Team leader is automatically assigned (user who clicks "Join Hackathon")
- Team leader gets `status: "approved"` immediately
- Other members get `status: "pending"` (may need approval later)
- Members field is optional - can create solo team
- All team member emails must exist in the user table
- Error messages guide users to ask members to sign up first
- Frontend validates emails before backend for better UX
