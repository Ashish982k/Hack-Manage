# Quick Reference - Join Hackathon Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                                 │
└─────────────────────────────────────────────────────────────────┘

1. User on Hackathon Detail Page
   │
   ├─ Not Joined? → [Join Hackathon] button shown
   │
   └─ Already Joined? → [Leave Hackathon] button shown


┌─────────────────────────────────────────────────────────────────┐
│              JOINING FLOW (New User)                            │
└─────────────────────────────────────────────────────────────────┘

User clicks [Join Hackathon]
   │
   ├─> Frontend: POST /hackathons/:id/join
   │
   ├─> Backend validates:
   │   ├─ User not already in team? ✓
   │   └─ Hackathon exists? ✓
   │
   ├─> Backend returns: { redirect: true }
   │
   ├─> Frontend: router.push('/hackathons/:id/create-team')
   │
   └─> User sees Create Team Page
       │
       ├─ Enters Team Name (required)
       │  └─ "You will be assigned as team leader"
       │
       ├─ Enters Member Emails (optional, up to 5)
       │  └─ Frontend checks each email exists
       │      └─ GET /users/check?email=xxx
       │
       ├─ Clicks [Create Team]
       │
       ├─> Frontend: POST /teams
       │   Body: {
       │     hackathonId,
       │     teamName,
       │     members: [emails]
       │   }
       │
       ├─> Backend creates:
       │   ├─ Team record (user as leaderId)
       │   ├─ Team leader → status: "approved"
       │   └─ Team members → status: "pending"
       │
       ├─> Backend returns: { teamId }
       │
       └─> Frontend: router.push('/hackathons/:id')
           │
           └─> User sees team in Team section
               └─> Button now shows [Leave Hackathon]


┌─────────────────────────────────────────────────────────────────┐
│              LEAVING FLOW (Existing Member)                     │
└─────────────────────────────────────────────────────────────────┘

User clicks [Leave Hackathon]
   │
   ├─> Frontend: DELETE /hackathons/:id/join
   │
   ├─> Backend checks role:
   │   │
   │   ├─ Team Leader?
   │   │  └─> Delete entire team (cascade deletes submissions)
   │   │
   │   └─ Regular Member?
   │      └─> Remove user from teamMembers only
   │
   ├─> Backend returns: { message: "Successfully left" }
   │
   ├─> Frontend: fetchTeam()
   │   └─> Returns 404 (no team)
   │
   └─> UI updates:
       ├─ Button shows [Join Hackathon]
       └─ Team section shows "No team yet"


┌─────────────────────────────────────────────────────────────────┐
│                    ERROR CASES                                  │
└─────────────────────────────────────────────────────────────────┘

Trying to join when already in team:
   POST /hackathons/:id/join
   → 409 Conflict
   → "Already joined this hackathon"

Hackathon doesn't exist:
   POST /hackathons/:id/join
   → 404 Not Found
   → "Hackathon not found"

Email not registered:
   Frontend: GET /users/check?email=xxx
   → { exists: false }
   → "User with email xxx is not registered or verified"

Backend validates email again:
   POST /teams
   → 400 Bad Request
   → "User with email xxx is not registered or verified"


┌─────────────────────────────────────────────────────────────────┐
│              DATABASE STRUCTURE                                 │
└─────────────────────────────────────────────────────────────────┘

teams
├─ id (UUID)
├─ hackathonId
├─ name ← User enters this
├─ leaderId ← User who clicked "Join"
└─ CASCADE DELETE → teamMembers, submissions

teamMembers
├─ id (UUID)
├─ teamId → teams.id
├─ userId → user.id
└─ status
   ├─ "approved" ← Team leader (auto-assigned)
   └─ "pending" ← Team members (may need approval)


┌─────────────────────────────────────────────────────────────────┐
│              KEY DIFFERENCES FROM AUTO-CREATE                   │
└─────────────────────────────────────────────────────────────────┘

Before (Auto-create):
   Click [Join] → Team created immediately with "My Team"

Now (Manual create):
   Click [Join] → Redirect to form → User enters name → Team created

Benefits:
   ✓ User chooses meaningful team name
   ✓ User can add members during creation
   ✓ Emails validated before team creation
   ✓ Better UX with explicit team setup
   ✓ Team leader role is clear


┌─────────────────────────────────────────────────────────────────┐
│                    TESTING COMMANDS                             │
└─────────────────────────────────────────────────────────────────┘

# Check if user can join (validation only)
curl -X POST http://localhost:5000/hackathons/{id}/join \
  -H "Cookie: session=..." \
  --include

Expected: 200 OK with { redirect: true }

# Check if email exists
curl http://localhost:5000/users/check?email=test@example.com \
  -H "Cookie: session=..." \
  --include

Expected: 200 OK with { exists: true/false }

# Create team
curl -X POST http://localhost:5000/teams \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "hackathonId": "xxx",
    "teamName": "Awesome Team",
    "members": ["user1@example.com", "user2@example.com"]
  }' \
  --include

Expected: 200 OK with { teamId: "..." }

# Leave hackathon
curl -X DELETE http://localhost:5000/hackathons/{id}/join \
  -H "Cookie: session=..." \
  --include

Expected: 200 OK with { message: "Successfully left" }


┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND STATES                              │
└─────────────────────────────────────────────────────────────────┘

isJoined = false
├─ Button: [Join Hackathon]
├─ Team Section: "No team yet"
└─ Message: "Click 'Join Hackathon' to create your team"

isJoined = true
├─ Button: [Leave Hackathon]
├─ Team Section: Shows team name and members
└─ Shows submission form if available


┌─────────────────────────────────────────────────────────────────┐
│              VALIDATION LAYERS                                  │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Frontend Form Validation
├─ Team name not empty
├─ Valid email format
└─ Check email exists via API

Layer 2: Backend Team Creation
├─ Hackathon exists
├─ User not already in team
├─ Email exists in user table
└─ Create team + members

Layer 3: Database Constraints
├─ Foreign keys (teamId, userId, hackathonId)
├─ Cascade deletes
└─ Default status values


┌─────────────────────────────────────────────────────────────────┐
│                    SUCCESS METRICS                              │
└─────────────────────────────────────────────────────────────────┘

✓ User can choose team name
✓ User becomes team leader automatically
✓ Team members validated before creation
✓ Clear error messages for invalid emails
✓ Can create solo team (no members)
✓ Can add up to 5 members
✓ Leader status = "approved"
✓ Member status = "pending"
✓ Leaving as leader deletes team
✓ Leaving as member removes only user
✓ UI updates correctly throughout flow
