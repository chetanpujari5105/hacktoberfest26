"use client";

interface ButtonCheckoutProps {
  priceId: string;
}

export default function ButtonCheckout({ priceId }: ButtonCheckoutProps) {
  const handleCheckout = async () => {
    // TODO: call /api/stripe/checkout with priceId to create a Checkout session
    console.log("Checkout for price:", priceId);
  };

  return (
    <button onClick={handleCheckout} className="btn btn-primary btn-block">
      Subscribe
    </button>
  );
}
