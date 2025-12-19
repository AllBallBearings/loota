export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy - Loota</h1>
      <div className="prose prose-sm max-w-none space-y-6">
        <p className="text-sm text-gray-600"><strong>Last Updated</strong>: January 2025</p>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Introduction</h2>
          <p>Loota (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use the Loota mobile application (&quot;App&quot;).</p>
          <p>By using the App, you agree to the collection and use of information in accordance with this policy.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">1.1 Personal Information</h3>

          <h4 className="text-lg font-semibold mt-4 mb-2">Name</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Purpose</strong>: User identification and display in the App</li>
            <li><strong>When Collected</strong>: During account creation or hunt joining</li>
            <li><strong>Requirement</strong>: Optional (defaults to &quot;Anonymous&quot; if not provided)</li>
          </ul>

          <h4 className="text-lg font-semibold mt-4 mb-2">Phone Number</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Purpose</strong>: Contact sharing with hunt creators for prize communication</li>
            <li><strong>When Collected</strong>: Required when joining a hunt</li>
            <li><strong>Requirement</strong>: Required for hunt participation</li>
          </ul>

          <h4 className="text-lg font-semibold mt-4 mb-2">Device ID</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Purpose</strong>: Account management and preventing duplicate accounts</li>
            <li><strong>When Collected</strong>: Automatically upon app installation</li>
            <li><strong>Requirement</strong>: Required for app functionality</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">1.2 Location Information</h3>

          <h4 className="text-lg font-semibold mt-4 mb-2">Precise Location (GPS Coordinates)</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Purpose</strong>: Placing and finding virtual treasures at real-world locations</li>
            <li><strong>When Collected</strong>: During active gameplay when you grant location permissions</li>
            <li><strong>Requirement</strong>: Required for AR treasure hunting features</li>
            <li><strong>Storage</strong>: Used in real-time, not stored long-term on our servers</li>
          </ul>

          <h4 className="text-lg font-semibold mt-4 mb-2">Compass Heading</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Purpose</strong>: Device orientation for accurate AR object placement</li>
            <li><strong>When Collected</strong>: During active gameplay</li>
            <li><strong>Requirement</strong>: Required for AR functionality</li>
            <li><strong>Storage</strong>: Processed locally on your device</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">1.3 Camera and AR Data</h3>

          <h4 className="text-lg font-semibold mt-4 mb-2">Camera Feed</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Purpose</strong>: Displaying augmented reality treasures in your real-world view</li>
            <li><strong>When Collected</strong>: When you grant camera permissions during gameplay</li>
            <li><strong>Processing</strong>: Processed locally on your device in real-time</li>
            <li><strong>Storage</strong>: <strong>NOT stored or transmitted to servers</strong></li>
          </ul>

          <h4 className="text-lg font-semibold mt-4 mb-2">Hand Pose Data</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Purpose</strong>: Detecting hand gestures for treasure summoning feature</li>
            <li><strong>When Collected</strong>: During active gameplay</li>
            <li><strong>Processing</strong>: Processed entirely on your device using Apple&apos;s Vision framework</li>
            <li><strong>Storage</strong>: <strong>NOT stored or transmitted to servers</strong></li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">1.4 Hunt Participation Data</h3>

          <h4 className="text-lg font-semibold mt-4 mb-2">Hunt Progress</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li>Hunts joined, pins collected, completion status</li>
            <li><strong>Purpose</strong>: Tracking your progress and determining winners</li>
          </ul>

          <h4 className="text-lg font-semibold mt-4 mb-2">Timestamps</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Purpose</strong>: Recording when hunts are completed</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">2.1 Core App Functionality</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Creating and managing your user account</li>
            <li>Enabling AR treasure hunt gameplay</li>
            <li>Tracking hunt progress and determining winners</li>
            <li>Processing pin collections</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">2.2 Contact Information Sharing</h3>
          <p className="font-semibold">IMPORTANT: When you complete a treasure hunt, we share your contact information (name and phone number) with the hunt creator.</p>

          <p><strong>Purpose</strong>: To facilitate communication about any prizes the hunt creator may offer</p>

          <p><strong>What This Means</strong>:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Hunt creators can contact you via phone call, text, or other means</li>
            <li>This sharing is for communication purposes only</li>
            <li>Loota does NOT process, guarantee, or verify any prizes</li>
            <li>All prize arrangements are between you and the hunt creator</li>
          </ul>

          <p><strong>You Have Control</strong>:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>This sharing is consensual - you agree when joining a hunt</li>
            <li>You provide your contact information voluntarily</li>
            <li>You can choose which hunts to join</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">2.3 App Improvement</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Analyzing usage patterns to improve features</li>
            <li>Identifying and fixing bugs</li>
            <li>Understanding user preferences</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Information Sharing and Disclosure</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Hunt Creators (Conditional Sharing)</h3>
          <p><strong>When</strong>: Only when you complete a hunt as the winner</p>
          <p><strong>What We Share</strong>:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your name</li>
            <li>Your phone number</li>
          </ul>
          <p><strong>Why</strong>: To enable hunt creators to contact you about any prizes they may offer</p>
          <p><strong>Loota&apos;s Role</strong>: We facilitate the exchange but are NOT responsible for how hunt creators use your information or fulfill prizes</p>

          <h3 className="text-xl font-semibold mt-6 mb-3">3.2 Service Providers</h3>
          <p>We may share information with third-party service providers who assist in:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>App hosting and infrastructure</li>
            <li>Analytics and app performance monitoring</li>
            <li>Customer support</li>
          </ul>
          <p>These providers are contractually obligated to protect your data and use it only for specified purposes.</p>

          <h3 className="text-xl font-semibold mt-6 mb-3">3.3 Legal Requirements</h3>
          <p>We may disclose your information if required by law or in response to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Valid legal requests (subpoenas, court orders)</li>
            <li>Enforcement of our Terms of Service</li>
            <li>Protection of our rights or safety of others</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">3.4 Business Transfers</h3>
          <p>If Loota is acquired or merged, your information may be transferred to the new entity. You will be notified of any such change.</p>

          <h3 className="text-xl font-semibold mt-6 mb-3">3.5 What We DON&apos;T Do</h3>
          <p>We do NOT:</p>
          <ul className="list-none pl-6 space-y-1">
            <li>✗ Sell your personal information to third parties</li>
            <li>✗ Share your information for marketing purposes</li>
            <li>✗ Use your camera feed or hand pose data beyond local processing</li>
            <li>✗ Track your location when the app is not in use</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Retention</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Personal Information</strong>: Retained while your account is active and for a reasonable period afterward for record-keeping</li>
            <li><strong>Location Data</strong>: Used in real-time during gameplay, not stored long-term</li>
            <li><strong>Camera/Hand Data</strong>: Processed locally on your device, never transmitted or stored</li>
            <li><strong>Hunt Progress</strong>: Retained to maintain hunt history and leaderboards</li>
          </ul>
          <p><strong>You Can Request Deletion</strong>: See Section 7 (Your Rights)</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Security</h2>
          <p>We implement industry-standard security measures:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Secure server infrastructure</li>
            <li>Access controls and authentication</li>
            <li>Regular security audits</li>
          </ul>
          <p><strong>However</strong>: No system is 100% secure. You use the App at your own risk.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Children&apos;s Privacy</h2>
          <p>Loota is rated 4+ and suitable for all ages. However:</p>

          <p><strong>Parental Guidance Recommended</strong>: Parents should supervise children when using the App, especially when:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Providing personal information (name, phone number)</li>
            <li>Navigating real-world locations for treasure hunts</li>
            <li>Communicating with hunt creators</li>
          </ul>

          <p><strong>COPPA Compliance</strong>: We do not knowingly collect personal information from children under 13 without parental consent. If you believe a child has provided information without consent, contact us at privacy@loota.fun.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights and Choices</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">7.1 Access and Update</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>View your account information in the App</li>
            <li>Update your name and phone number at any time</li>
            <li>Contact us to request a copy of your data</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">7.2 Delete Your Account</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email support@loota.fun to request account deletion</li>
            <li>We will delete your personal information within 30 days</li>
            <li>Hunt history may be retained in anonymized form</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">7.3 Location Permissions</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>You can revoke location access in your device settings</li>
            <li>Note: This will prevent AR treasure hunting functionality</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">7.4 Camera Permissions</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>You can revoke camera access in your device settings</li>
            <li>Note: This will prevent AR viewing of treasures</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">7.5 Opt-Out of Contact Sharing</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Don&apos;t join hunts if you don&apos;t want to share contact information</li>
            <li>Once shared, you must work directly with hunt creators regarding data removal</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">8. International Users</h2>
          <p>Loota is based in [Your Country]. If you access the App from outside [Your Country], your information may be transferred to and processed in [Your Country].</p>
          <p>By using the App, you consent to this transfer.</p>
          <p><strong>EU Users</strong>: If you are in the European Union, you have additional rights under GDPR, including the right to data portability and the right to lodge a complaint with a supervisory authority.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">9. Third-Party Services</h2>
          <p>The App may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. Please review their privacy policies.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Posting the new policy in the App</li>
            <li>Updating the &quot;Last Updated&quot; date</li>
            <li>Sending an email notification (if applicable)</li>
          </ul>
          <p><strong>Continued use after changes constitutes acceptance</strong> of the updated policy.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
          <p>For questions or concerns about this Privacy Policy or your data:</p>
          <p className="mt-2">
            <strong>Email</strong>: privacy@loota.fun<br />
            <strong>Support</strong>: support@loota.fun<br />
            <strong>Website</strong>: <a href="https://loota.fun" className="text-blue-600 hover:underline">https://loota.fun</a>
          </p>
          <p><strong>Data Requests</strong>: To request access, correction, or deletion of your personal information, email privacy@loota.fun with the subject &quot;Data Request&quot;.</p>
        </section>

        <div className="border-t pt-6 mt-8 text-center">
          <p className="font-semibold">By using Loota, you acknowledge that you have read and understood this Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}
