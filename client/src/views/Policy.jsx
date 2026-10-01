import React from "react";
import { Link } from "react-router-dom";
import "../../public/css/policy.css";

const POLICIES = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: September 2026",
    intro:
      "Printynozzle respects your privacy. This policy explains what information we collect when you shop with us and how we use it.",
    sections: [
      {
        heading: "Information We Collect",
        body: [
          "Contact details you provide at checkout or registration — name, phone number, email address and delivery address.",
          "Order details — products purchased, 3D-print files you upload, amounts paid and payment references.",
          "Technical data — device, browser and pages visited, used to keep the store fast and secure.",
        ],
      },
      {
        heading: "How We Use It",
        body: [
          "To process, ship and support your orders, including courier booking and delivery updates.",
          "To send order confirmations, GST invoices and payment updates by email or SMS.",
          "To improve our catalog, pricing and customer support. We never sell your personal data.",
        ],
      },
      {
        heading: "Payments & Files",
        body: [
          "Online payments are processed securely by Razorpay — card and UPI credentials never touch our servers.",
          "3D model files you upload are used only to manufacture your order and are never shared publicly.",
          "Payment screenshots shared for QR orders are used only for payment verification.",
        ],
      },
      {
        heading: "Your Rights",
        body: [
          "You can ask us at info.printynozzle@gmail.com to correct or delete your account data at any time.",
          "Marketing messages always carry an unsubscribe option.",
        ],
      },
    ],
  },
  shipping: {
    title: "Shipping Policy",
    updated: "Last updated: September 2026",
    intro:
      "We dispatch across India through trusted courier partners. Here is how delivery timelines and charges work.",
    sections: [
      {
        heading: "Dispatch Time",
        body: [
          "Orders placed before 2:00 PM are dispatched the same working day.",
          "Standard delivery takes 3–5 working days; Express delivery takes 1–2 working days.",
          "Custom 3D prints are manufactured to order — the printing time shown on the product page adds to the delivery window.",
        ],
      },
      {
        heading: "Shipping Charges",
        body: [
          "Standard delivery is FREE on orders above Rs. 999, otherwise a flat charge applies as shown at checkout.",
          "Express delivery is charged extra as shown at checkout.",
          "Live courier rates may apply for your pincode and are displayed before payment.",
        ],
      },
      {
        heading: "Tracking & Delivery",
        body: [
          "You receive an SMS and email with the tracking ID once your order ships, and can track it under My Orders.",
          "Please provide a complete address with a reachable phone number — failed deliveries may incur re-shipping charges.",
          "Cash on Delivery orders must be paid in full at the time of delivery.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    updated: "Last updated: September 2026",
    intro:
      "By purchasing from Printynozzle you agree to the terms below. Please read them before placing an order.",
    sections: [
      {
        heading: "Orders & Pricing",
        body: [
          "All prices are in Indian Rupees and inclusive of GST unless stated otherwise.",
          "We reserve the right to cancel orders affected by pricing errors, stock shortages or unverifiable payments, with a full refund.",
          "Coupons apply as displayed at checkout and cannot be combined unless stated.",
        ],
      },
      {
        heading: "3D Printing Service",
        body: [
          "Upload only files you own or are licensed to reproduce — you are responsible for the intellectual property of your models.",
          "Quoted weight, print time and price are estimates derived from the uploaded geometry; minor variations are normal.",
          "Layer lines and minor surface artifacts are inherent to FDM 3D printing and are not treated as defects.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "We accept UPI, cards, net banking, wallets via Razorpay, direct QR/UPI transfer with screenshot verification, and Cash on Delivery on eligible pincodes.",
          "Orders paid by QR are confirmed only after our team verifies the payment screenshot.",
        ],
      },
      {
        heading: "GST Invoices",
        body: [
          "A GST invoice is emailed for every purchase. Share correct GSTIN and billing details at order time — later corrections are not possible.",
          "Orders without a valid GSTIN at booking are treated as B2C supply with no input tax credit.",
        ],
      },
    ],
  },
  returns: {
    title: "Return Policy",
    updated: "Last updated: September 2026",
    intro:
      "We offer a 7-day, hassle-free replacement or return window on eligible items as described below.",
    sections: [
      {
        heading: "7-Day Returns",
        body: [
          "Notify us within 2 days of delivery if the product is faulty, incorrect or not as specified — claims after this window are not covered.",
          "Approved warranty claims are resolved by replacement first; a refund is issued only when the product is unavailable, as per policy.",
          "Products must be unused, with original packaging and accessories, to qualify.",
        ],
      },
      {
        heading: "Non-Returnable Items",
        body: [
          "Custom 3D prints manufactured to your files, consumed filament, and sale/clearance items cannot be returned unless faulty on arrival.",
          "Physical damage from misuse, incorrect wiring or over-voltage is not covered.",
        ],
      },
      {
        heading: "How to Raise a Return",
        body: [
          "Write to info.printynozzle@gmail.com or call 9836609063 with your order number, unboxing photos/video and a description of the issue.",
          "Once approved, we arrange reverse pickup or replacement dispatch and keep you updated by email and SMS.",
        ],
      },
    ],
  },
};

export default function Policy({ page = "privacy" }) {
  const policy = POLICIES[page] || POLICIES.privacy;
  const links = [
    { id: "privacy", label: "Privacy Policy", to: "/privacy" },
    { id: "shipping", label: "Shipping Policy", to: "/shipping" },
    { id: "terms", label: "Terms & Conditions", to: "/terms" },
    { id: "returns", label: "Return Policy", to: "/returns" },
    { id: "faqs", label: "FAQs", to: "/faqs" },
  ];

  return (
    <div className="policy-page-wrapper">
      <div className="policy-page-container">
        <div className="policy-breadcrumb">
          <Link to="/">Home</Link>
          <span>&gt;</span>
          <span className="policy-breadcrumb-current">{policy.title}</span>
        </div>

        <div className="policy-layout">
          <aside className="policy-side">
            {links.map((l) => (
              <Link
                key={l.id}
                to={l.to}
                className={`policy-side-link ${l.id === page ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </aside>

          <article className="policy-article">
            <h1>{policy.title}</h1>
            <p className="policy-updated">{policy.updated}</p>
            <p className="policy-intro">{policy.intro}</p>
            {policy.sections.map((section) => (
              <section key={section.heading} className="policy-section">
                <h2>{section.heading}</h2>
                <ul>
                  {section.body.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="policy-contact-box">
              <strong>Questions about this policy?</strong>
              <span>
                Email <a href="mailto:info.printynozzle@gmail.com">info.printynozzle@gmail.com</a> or
                call <a href="tel:+919836609063">9836609063</a> (Mon – Sat, 10 AM – 7 PM).
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
