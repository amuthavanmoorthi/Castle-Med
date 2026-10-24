import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Contact from '../pages/Contact'

function renderPage() {
  return render(
    <MemoryRouter>
      <Contact />
    </MemoryRouter>,
  )
}

async function fill() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Name'), 'Grace Hopper')
  await user.type(screen.getByLabelText('Email'), 'grace@example.com')
  await user.type(screen.getByLabelText('Message'), 'Do you have parking?')
  await user.click(screen.getByRole('button', { name: /send message/i }))
}

afterEach(() => vi.restoreAllMocks())

describe('Contact form', () => {
  it('clears the form only after the server accepts it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    renderPage()
    await fill()
    expect(await screen.findByRole('status')).toHaveTextContent(/message has been sent/i)
    expect(screen.getByLabelText('Message')).toHaveValue('')
  })

  it('keeps the message and shows an error when the network fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    renderPage()
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't reach/i)
    expect(screen.getByLabelText('Message')).toHaveValue('Do you have parking?')
  })

  it('shows field errors from the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Please check the highlighted fields', fields: { email: 'value is not a valid email address' } }), { status: 422 }),
    )
    renderPage()
    await fill()
    expect(await screen.findByText('value is not a valid email address')).toBeInTheDocument()
  })
})
