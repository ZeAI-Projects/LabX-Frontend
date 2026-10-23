import { ArrowDown, ArrowUpRight, CheckCircle2, GitBranch, RotateCcw, XCircle } from 'lucide-react';
import './CollaborationWorkflow.css';

function Connector({ children }) {
  return <div className="cw-connector"><ArrowDown size={16} aria-hidden="true" /><span>{children}</span></div>;
}

function Step({ actor, title, children, id, tone = '' }) {
  return <div id={id} className={`cw-step ${tone ? `cw-step--${tone}` : ''}`}>
    <span className="cw-actor">{actor}</span><strong>{title}</strong>{children && <p>{children}</p>}
  </div>;
}

export function CollaborationWorkflow() {
  return <details className="cw-overview">
    <summary><GitBranch size={19} aria-hidden="true" /><span>How joining and mission review work<small>Two ways to join. One shared team and submission workflow.</small></span></summary>
    <div className="cw-content">
      <div className="cw-actors" aria-label="Workflow actors">
        <span><b>Founder</b> Publishes, invites, assigns, reviews and uploads.</span>
        <span><b>Member</b> Joins, completes work and revises.</span>
        <span><b>System</b> Validates, saves and prevents duplicates.</span>
        <span><b>AI evaluation</b> Checks the approved version; simulated here.</span>
      </div>
      <h2>1. Join a startup team</h2>
      <div className="cw-branches">
        <section aria-label="Public collaboration workflow">
          <Step actor="Founder" title="Public Collaboration Post">Select the project, describe the opportunity and publish.</Step>
          <Connector>Published opportunity</Connector>
          <Step actor="Member" title="Request to Join">Choose an opportunity and submit an interest message.</Step>
          <Connector>System validates and saves</Connector>
          <Step actor="Founder" title="Pending Founder Review">Review the applicant, Member ID and request.</Step>
          <div className="cw-decisions">
            <div className="cw-outcome cw-outcome--accept"><CheckCircle2 size={17} /><span><b>Accept ↓</b>Continue to the shared team state below.</span></div>
            <div className="cw-outcome cw-outcome--decline"><XCircle size={17} /><span><b>Decline → Declined by Founder</b>Path ends. No membership is created.</span></div>
          </div>
        </section>
        <section aria-label="Direct invitation workflow">
          <Step actor="Founder" title="Direct Member Invitation">Select the project, enter an exact Member ID and Search Member.</Step>
          <Connector>Matching member found</Connector>
          <Step actor="Founder" title="Send Invitation">Review the member and optionally add a message.</Step>
          <Connector>System validates and saves</Connector>
          <Step actor="Member" title="Pending Member Response">Review the project, inviting founder and message.</Step>
          <div className="cw-decisions">
            <div className="cw-outcome cw-outcome--accept"><CheckCircle2 size={17} /><span><b>Accept ↓</b>Continue to the shared team state below.</span></div>
            <div className="cw-outcome cw-outcome--decline"><XCircle size={17} /><span><b>Decline → Declined by Member</b>Path ends. No membership is created.</span></div>
          </div>
        </section>
      </div>
      <Connector>Either accepted path • one membership per member and startup</Connector>
      <Step actor="System" title="Member Joins Startup Team" tone="joined">Record the acceptance and team membership together. Both joining methods unlock the same team and assignment area.</Step>
      <Connector>Founder opens the team's assignment area</Connector>
      <h2>2. Complete and review a mission</h2>
      <div className="cw-mission-path">
        <Step actor="Founder" title="Assigned">Select a team member and eligible mission, review the deliverable and confirm. Locked work waits for its prerequisites.</Step>
        <Connector>Member opens assigned work</Connector>
        <Step actor="Member" title="In Progress">Prepare notes and evidence, then Submit to Founder.</Step>
        <Connector>System freezes submission version and evidence</Connector>
        <Step actor="System" title="Submitted to Founder">The version waits for review. Submitting does not approve or evaluate it.</Step>
        <Connector>Founder opens the submission</Connector>
        <Step id="workflow-founder-review" actor="Founder" title="Mission Review and Approval" tone="review">Under Founder Review: inspect the version, evidence and previous feedback.</Step>
        <div className="cw-branches cw-review-branches">
          <section aria-label="Revision loop">
            <Connector>Request Changes + actionable feedback</Connector>
            <Step actor="Founder" title="Changes Requested">The reviewed version and feedback remain in history.</Step>
            <Connector>Member Revises Mission</Connector>
            <Step actor="Member" title="Revision In Progress">Update the work and select Resubmit to Founder.</Step>
            <Connector>New immutable version</Connector>
            <Step actor="System" title="Resubmitted to Founder">The founder reviews again. Repeat revisions whenever needed.</Step>
            <a className="cw-return" href="#workflow-founder-review"><RotateCcw size={16} />Return to Founder Review ↑</a>
          </section>
          <section aria-label="Founder approval and upload workflow">
            <Connector>Approve Submission</Connector>
            <Step actor="Founder" title="Founder Approved">Approval belongs to this version only.</Step>
            <Connector>Awaiting AI Upload</Connector>
            <Step id="workflow-approved-upload" actor="Founder" title="Founder Uploads Approved Mission Submission">Confirm the project, mission, member and approved evidence. Select Upload Approved Submission for AI Evaluation.</Step>
            <div className="cw-outcome cw-outcome--accept cw-upload-gate"><CheckCircle2 size={17} /><span><b>Confirmed upload ↓</b>Continue to simulated AI evaluation below. Changes Requested returns to review and cannot enter this path.</span></div>
          </section>
        </div>
        <section aria-label="AI evaluation and retry workflow">
            <Connector>After the founder explicitly uploads the approved snapshot</Connector>
            <Step actor="System" title="Uploading">Prepare the immutable approved version.</Step>
            <Connector>Upload succeeds</Connector>
            <Step actor="AI evaluation · simulated" title="Queued for Evaluation">The job is tied to the uploaded submission version.</Step>
            <Connector>Start evaluation</Connector>
            <Step id="workflow-evaluating" actor="AI evaluation · simulated" title="Evaluating">Check the exact approved evidence snapshot.</Step>
            <div className="cw-evaluation-outcomes">
              <div className="cw-outcome cw-outcome--accept"><CheckCircle2 size={17} /><span><b>Success → Evaluation Completed</b>Show the outcome, feedback, evaluation date and version. Meets requirements follows the existing mission completion rules.</span></div>
              <a className="cw-return" href="#workflow-founder-review"><RotateCcw size={16} /><span><b>Needs improvement → Member Revises Mission</b>New version → founder review → approval → new upload.</span></a>
              <div className="cw-outcome cw-outcome--decline"><XCircle size={17} /><span><b>Technical error → Evaluation Failed</b>Keep the approved evidence. No new member submission is required.</span></div>
              <a className="cw-return" href="#workflow-approved-upload"><ArrowUpRight size={16} /><span><b>Retry upload → Uploading</b>For an upload failure.</span></a>
              <a className="cw-return" href="#workflow-evaluating"><ArrowUpRight size={16} /><span><b>Retry evaluation → Queued for Evaluation → Evaluating</b>For an evaluation failure.</span></a>
            </div>
        </section>
      </div>
      <p className="cw-footnote">This preview saves activity in this browser. Invitations are not delivered externally, files are represented by metadata, and AI evaluation is simulated.</p>
    </div>
  </details>;
}
