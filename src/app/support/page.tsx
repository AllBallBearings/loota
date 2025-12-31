export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Loota Support</h1>
      <div className="prose prose-sm max-w-none space-y-6">
        <p>Welcome to Loota support! Here you&apos;ll find answers to common questions and ways to contact us.</p>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Frequently Asked Questions</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">General Questions</h3>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">Q: What is Loota?</p>
              <p>A: Loota is an augmented reality (AR) treasure hunting app that lets you discover and collect virtual treasures placed in real-world locations. You can join hunts created by others or create your own!</p>
            </div>

            <div>
              <p className="font-semibold">Q: What devices are supported?</p>
              <p>A: Loota requires:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>iPhone XS or newer (2018+ models)</li>
                <li>iOS 18.0 or later</li>
                <li>ARKit support</li>
                <li>Camera and location permissions</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">Q: Is Loota free?</p>
              <p>A: Yes! Loota is free to download and use.</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-3">Hunt Questions</h3>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">Q: How do I join a hunt?</p>
              <p>A: Scan a QR code or enter a hunt ID to load hunt details. Review the information, provide your name and phone number, then tap &quot;Join Hunt&quot; to start hunting!</p>
            </div>

            <div>
              <p className="font-semibold">Q: How do I find treasures?</p>
              <p>A: Use your phone&apos;s camera to view AR objects placed at real-world locations. Walk around to get closer to treasures, then approach them to collect.</p>
            </div>

            <div>
              <p className="font-semibold">Q: What is the hand gesture summoning feature?</p>
              <p>A: Hold your hand in front of the camera to summon nearby treasures (within 10 feet). Objects will float toward you for easy collection!</p>
            </div>

            <div>
              <p className="font-semibold">Q: Why can&apos;t I see any treasures?</p>
              <p>A: Make sure you&apos;ve:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Granted camera and location permissions</li>
                <li>Joined a hunt successfully</li>
                <li>Are within range of treasure locations</li>
                <li>Have a stable internet connection</li>
              </ul>
            </div>
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-3">Prize Questions</h3>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">Q: How do prizes work?</p>
              <p>A: <strong>IMPORTANT</strong>: Hunt creators may offer prizes at their discretion. Loota is a platform that connects you with hunt creators—we do NOT guarantee or process prizes.</p>
            </div>

            <div>
              <p className="font-semibold">Q: I completed a hunt. When do I get my prize?</p>
              <p>A: If the hunt creator offered a prize, they will contact you directly using the phone number you provided. Prize fulfillment is between you and the hunt creator.</p>
            </div>

            <div>
              <p className="font-semibold">Q: I haven&apos;t received my prize. What should I do?</p>
              <p>A: Contact the hunt creator directly. Loota cannot assist with prize disputes or fulfillment issues, as we are a communication platform only.</p>
            </div>

            <div>
              <p className="font-semibold">Q: Can Loota help me get a prize the creator promised?</p>
              <p>A: Unfortunately, no. All prize arrangements are between you and the hunt creator. Loota does not guarantee, verify, or enforce prize promises.</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-3">Account &amp; Privacy</h3>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">Q: How do I update my name or phone number?</p>
              <p>A: When joining a new hunt, you can edit your information before confirming. You can also request account updates by contacting support@loota.fun.</p>
            </div>

            <div>
              <p className="font-semibold">Q: How is my contact information used?</p>
              <p>A: When you win a hunt, your name and phone number are shared with the hunt creator so they can contact you about any prizes they may offer. See our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> for full details.</p>
            </div>

            <div>
              <p className="font-semibold">Q: Can I delete my account?</p>
              <p>A: Yes! Email support@loota.fun with &quot;Delete Account&quot; in the subject line. We&apos;ll process your request within 30 days.</p>
            </div>

            <div>
              <p className="font-semibold">Q: Is my location data stored?</p>
              <p>A: No. Location data is used in real-time during gameplay and is not stored long-term on our servers.</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mt-6 mb-3">Technical Issues</h3>

          <div className="space-y-4">
            <div>
              <p className="font-semibold">Q: The app crashes or freezes. What should I do?</p>
              <p>A: Try these steps:</p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>Force quit the app and reopen it</li>
                <li>Restart your iPhone</li>
                <li>Check for iOS updates</li>
                <li>Reinstall the app</li>
              </ol>
              <p>If the problem persists, contact support (see below) with details.</p>
            </div>

            <div>
              <p className="font-semibold">Q: AR objects aren&apos;t appearing in the right locations</p>
              <p>A: Make sure you&apos;ve:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Granted location permissions</li>
                <li>Are in an area with good GPS signal</li>
                <li>Have calibrated your compass by moving in a figure-8 pattern</li>
                <li>Are not indoors (for outdoor hunts)</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">Q: &quot;Location services disabled&quot; error</p>
              <p>A: Go to Settings &gt; Privacy &amp; Security &gt; Location Services &gt; Loota &gt; Select &quot;While Using the App&quot;</p>
            </div>

            <div>
              <p className="font-semibold">Q: &quot;Camera access denied&quot; error</p>
              <p>A: Go to Settings &gt; Privacy &amp; Security &gt; Camera &gt; Enable access for Loota</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Support</h2>

          <h3 className="text-xl font-semibold mt-6 mb-3">For Technical Issues</h3>
          <p><strong>Email</strong>: support@loota.fun</p>
          <p><strong>Subject</strong>: Technical Support - [Brief description]</p>
          <p><strong>Response Time</strong>: 24-48 hours</p>
          <p><strong>Please include</strong>:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Device model (e.g., iPhone 15 Pro)</li>
            <li>iOS version</li>
            <li>Description of the issue</li>
            <li>Steps to reproduce</li>
            <li>Screenshots (if applicable)</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-3">For Privacy &amp; Data Requests</h3>
          <p><strong>Email</strong>: privacy@loota.fun</p>
          <p><strong>Subject</strong>: Data Request - [Access/Deletion/Correction]</p>
          <p><strong>Response Time</strong>: 7-14 days</p>

          <h3 className="text-xl font-semibold mt-6 mb-3">For General Inquiries</h3>
          <p><strong>Email</strong>: hello@loota.fun</p>
          <p><strong>Response Time</strong>: 48-72 hours</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Additional Resources</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a></li>
            <li><a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a></li>
            <li><a href="https://apps.apple.com/app/loota" className="text-blue-600 hover:underline">App Store Page</a> <em>(update with actual link)</em></li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Community Guidelines</h2>
          <p>When using Loota, please:</p>
          <ul className="list-none pl-6 space-y-1">
            <li>✓ Be respectful to other users</li>
            <li>✓ Create hunts in safe, public locations</li>
            <li>✓ Follow local laws and regulations</li>
            <li>✓ Report inappropriate content or behavior</li>
          </ul>
          <p className="mt-4"><strong>Report Issues</strong>: Email support@loota.fun with &quot;Report Issue&quot; in the subject.</p>
        </section>

        <div className="border-t pt-6 mt-8 text-center">
          <p className="font-semibold">Need more help? Email us at support@loota.fun and we&apos;ll get back to you as soon as possible!</p>
        </div>
      </div>
    </div>
  );
}
