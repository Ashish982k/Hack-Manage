# Quick Start & Testing Guide

## Starting the Application

### Backend:
```bash
cd backend
npm install  # if not already installed
npm run dev  # or npm start
```

### Frontend:
```bash
cd frontend
npm install  # if not already installed
npm run dev
```

---

## Manual Testing Scenarios

### ✅ Scenario 1: User Joins Hackathon
**Steps:**
1. Navigate to a hackathon detail page
2. Click "Join Hackathon" button
3. **Expected:**
   - Toast message: "Joined the hackathon"
   - Button changes to "Leave Hackathon"
   - Team section shows team named "My Team"
   - User appears as "Leader" in team members

**Verify Backend:**
- Check terminal: Should see successful POST request
- Database: New team created with user as leader
- Database: User in teamMembers with status "approved"

---

### ✅ Scenario 2: User Tries to Join Same Hackathon Twice
**Steps:**
1. Already joined a hackathon
2. Try to click "Join Hackathon" again (by manipulating state or using API directly)
3. **Expected:**
   - Error toast: "Already joined this hackathon"
   - HTTP Status: 409 Conflict

**Test via cURL:**
```bash
curl -X POST http://localhost:5000/hackathons/{hackathon-id}/join \
  -H "Cookie: your-session-cookie" \
  --include
```

---

### ✅ Scenario 3: Team Leader Leaves Hackathon
**Steps:**
1. User is team leader (joined the hackathon)
2. Click "Leave Hackathon" button
3. **Expected:**
   - Toast message: "Left the hackathon"
   - Button changes back to "Join Hackathon"
   - Team section shows "No team yet"
   - Entire team deleted from database
   - All submissions for that team deleted (cascade)

**Verify Backend:**
- Check database: Team should be deleted
- Check database: All teamMembers for that team deleted
- Check database: All submissions for that team deleted

---

### ✅ Scenario 4: Regular Member Leaves Team
**Setup:**
1. Use the old create-team endpoint or add member manually
2. Non-leader member leaves

**Steps:**
1. User is NOT team leader
2. Click "Leave Hackathon"
3. **Expected:**
   - User removed from teamMembers
   - Team still exists
   - Other members remain
   - Leader unchanged

---

### ✅ Scenario 5: User Not in Team Views Page
**Steps:**
1. Navigate to hackathon detail page
2. User has NOT joined
3. **Expected:**
   - Button shows "Join Hackathon"
   - Team section shows "No team yet"
   - Message: "Join the hackathon to automatically create your team."
   - NO "Create Team" button visible

**Verify API:**
```bash
curl http://localhost:5000/hackathons/{hackathon-id}/team \
  -H "Cookie: your-session-cookie"
# Should return 404
```

---

### ✅ Scenario 6: Submission After Joining
**Steps:**
1. Join hackathon (auto-creates team)
2. Fill in Drive URL and GitHub repo
3. Select problem statement (if any)
4. Click "Submit"
5. **Expected:**
   - Submission successful
   - Status changes to "Submitted"
   - Submission linked to auto-created team

---

### ✅ Scenario 7: Invalid Hackathon
**Steps:**
1. Try to join non-existent hackathon
2. **Expected:**
   - HTTP Status: 404
   - Error message: "Hackathon not found"

**Test via cURL:**
```bash
curl -X POST http://localhost:5000/hackathons/invalid-id/join \
  -H "Cookie: your-session-cookie" \
  --include
```

---

### ✅ Scenario 8: Unauthorized Access
**Steps:**
1. Try to access endpoints without session
2. **Expected:**
   - HTTP Status: 401 Unauthorized

**Test via cURL:**
```bash
curl -X POST http://localhost:5000/hackathons/{id}/join \
  --include
```

---

## API Testing with cURL

### Join Hackathon:
```bash
curl -X POST http://localhost:5000/hackathons/{hackathon-id}/join \
  -H "Cookie: your-session-cookie" \
  --include
```

### Leave Hackathon:
```bash
curl -X DELETE http://localhost:5000/hackathons/{hackathon-id}/join \
  -H "Cookie: your-session-cookie" \
  --include
```

### Get Team Info:
```bash
curl http://localhost:5000/hackathons/{hackathon-id}/team \
  -H "Cookie: your-session-cookie" \
  --include
```

---

## Database Verification

### Check team was created:
```sql
SELECT * FROM teams WHERE hackathonId = '{hackathon-id}';
```

### Check team member:
```sql
SELECT tm.*, u.name 
FROM team_members tm 
JOIN user u ON tm.userId = u.id 
WHERE tm.teamId = '{team-id}';
```

### Check submissions:
```sql
SELECT * FROM submissions WHERE teamId = '{team-id}';
```

### Verify cascade deletion:
```sql
-- After leader leaves, these should all be empty:
SELECT * FROM teams WHERE id = '{team-id}';
SELECT * FROM team_members WHERE teamId = '{team-id}';
SELECT * FROM submissions WHERE teamId = '{team-id}';
```

---

## Common Issues & Troubleshooting

### Issue: "Already joined" error when trying to join
**Solution:** User already has a team for this hackathon. Check database or try leaving first.

### Issue: 401 Unauthorized
**Solution:** Ensure user is logged in and session cookie is valid.

### Issue: Team not appearing after join
**Solution:** Check browser console for errors. Verify `fetchTeam()` is being called.

### Issue: UI not updating after join/leave
**Solution:** 
- Check that `fetchTeam()` is being called in `handleJoin`
- Check that `isJoined` is being set based on response status (200 vs 404)

### Issue: Submissions not deleted when leader leaves
**Solution:** Verify database schema has `onDelete: "cascade"` for submissions.teamId

---

## Success Criteria

✅ User can join hackathon with one click
✅ Team is automatically created with name "My Team"
✅ User is set as team leader
✅ Button immediately updates to "Leave Hackathon"
✅ Team info appears in UI
✅ Cannot join same hackathon twice
✅ Leader leaving deletes entire team
✅ Member leaving removes only themselves
✅ No "Create Team" button or redirect
✅ All state derived from backend
✅ Proper error messages displayed

---

## Code Review Checklist

✅ Backend uses `userId` from session (not from request body)
✅ Proper HTTP status codes (201, 409, 404, 401)
✅ Team deletion uses `team.id`, not global `leaderId`
✅ Frontend always calls `fetchTeam()` after join/leave
✅ `isJoined` derived from API response, never manually set
✅ No redirect to `/create-team` anywhere
✅ Error handling displays backend messages
✅ Database cascades work correctly
✅ Comments explain the logic
✅ Try-catch blocks for error handling
