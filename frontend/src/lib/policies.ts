// Policy wording taken from the spa's own live site (Location page and Gift
// Cards page). Edit here and every page that shows it updates.
import type { Faq } from './catalog'

export const cancellationPolicy = [
  'Cancellations made 1 day or more before the scheduled appointment time will not incur any charges.',
  'Cancellations made within less than 12 hours of the scheduled appointment time may be subject to a cancellation fee of the deposit amount.',
  'No-shows (clients who fail to arrive for their appointment without prior notice) may be charged the full price of the scheduled service.',
]

export const refundPolicy = 'At Castle Spa & Massage, all purchases are final and non-refundable. We do not offer refunds under any circumstances.'

export const terms: { title: string; body: string }[] = [
  { title: 'Booking policy', body: 'All appointments are subject to availability and must be scheduled in advance.' },
  { title: 'Cancellation policy', body: cancellationPolicy.join(' ') },
  { title: 'Refund policy', body: refundPolicy },
  {
    title: 'Late arrivals',
    body: 'Please arrive on time for your appointment to ensure you receive the full duration of your scheduled service. Late arrivals may result in a shortened appointment time, with the full service fee still applicable.',
  },
  {
    title: 'Health conditions',
    body: 'It is the responsibility of the client to inform the therapist of any health conditions, allergies, or sensitivities prior to the appointment.',
  },
  {
    title: 'Gift cards and vouchers',
    body: 'Gift cards and vouchers are non-refundable and cannot be exchanged for cash. They must be presented at the time of redemption and are subject to expiration dates and terms specified at the time of purchase.',
  },
  {
    title: 'Conduct',
    body: 'We reserve the right to refuse service to anyone demonstrating inappropriate or disrespectful behavior towards our staff or other clients.',
  },
  {
    title: 'Changes to terms',
    body: 'Castle Spa & Massage reserves the right to update or modify these terms and conditions at any time without prior notice.',
  },
]

export const giftCardFaqs: Faq[] = [
  {
    q: 'Can I exchange my gift card for money?',
    a: 'Unfortunately, gift cards issued by Castle Spa & Massage cannot be exchanged for cash. They are non-transferable and can only be redeemed for services offered by Castle Spa & Massage.',
  },
  {
    q: 'How much time do I have to use my gift card?',
    a: 'Gift cards issued by Castle Spa & Massage are valid for 6 months from the date of purchase. After this time, the gift card will expire, and any remaining balance will be forfeited.',
  },
  {
    q: 'Can I pay for a service with my gift card?',
    a: 'Yes. If the total amount of your service is less than the value of your gift card, the remaining balance will be available for future use. If the total exceeds the value of your gift card, you will be asked to pay the difference using another payment method. We do not issue change.',
  },
]

export const bookingFaqs: Faq[] = [
  {
    q: 'How do I cancel or change my appointment?',
    a: 'Use the link in your confirmation, or go to Manage booking and enter your booking reference and email. Online cancellation is available up to 12 hours before your appointment; after that, please call us. To change the time, cancel and book again, or call us and we will help.',
  },
  { q: 'What is your cancellation policy?', a: cancellationPolicy.join(' ') },
  { q: 'Do you offer refunds?', a: refundPolicy },
  {
    q: 'What if I am running late?',
    a: 'Please arrive on time to receive the full duration of your service. Late arrivals may result in a shortened appointment, with the full service fee still applicable.',
  },
  {
    q: 'Should I tell my therapist about health conditions?',
    a: 'Yes. Please inform your therapist of any health conditions, allergies, or sensitivities before your appointment.',
  },
]
