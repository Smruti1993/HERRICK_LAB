// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

async function verifyRazorpaySignature(
  bodyText: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  const sigBytes = hexToBytes(signature);
  const dataBytes = encoder.encode(bodyText);
  
  return await crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const signature = req.headers.get("x-razorpay-signature") || "";
    const bodyText = await req.text();

    const isValid = await verifyRazorpaySignature(bodyText, signature, webhookSecret);
    if (!isValid) {
      console.error("Signature verification failed.");
      return new Response("Unauthorized Signature Verification Failed", { status: 400 });
    }

    const payload = JSON.parse(bodyText);
    
    if (payload.event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const paymentId = payment.id;
      const orderId = payment.order_id || "";
      const saleNo = payment.notes?.saleNo;

      if (saleNo) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const { error } = await supabase
          .from("pharmacy_direct_sales")
          .update({
            payment_status: "paid",
            pg_payment_id: paymentId,
            pg_order_id: orderId
          })
          .eq("sale_no", saleNo);

        if (error) {
          console.error("Database update error:", error);
          return new Response("Internal Database Error", { status: 500 });
        }
        
        console.log(`Successfully completed payment for sale: ${saleNo}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Webhook processing failed:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
