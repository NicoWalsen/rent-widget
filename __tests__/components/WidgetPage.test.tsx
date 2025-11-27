import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WidgetPage from '@/app/widget/page';

global.fetch = jest.fn();

describe('WidgetPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render the widget form', () => {
    render(<WidgetPage />);

    expect(screen.getByText('Widget de Predicción de Arriendo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Providencia/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/60/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Predecir/i })).toBeInTheDocument();
  });

  it('should have required fields', () => {
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);

    expect(comunaInput).toBeRequired();
    expect(m2Input).toBeRequired();
  });

  it('should update comuna input when user types', async () => {
    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i) as HTMLInputElement;

    await user.type(comunaInput, 'Santiago');

    expect(comunaInput.value).toBe('Santiago');
  });

  it('should update m2 input when user types', async () => {
    const user = userEvent.setup();
    render(<WidgetPage />);

    const m2Input = screen.getByPlaceholderText(/60/) as HTMLInputElement;

    await user.type(m2Input, '50');

    expect(m2Input.value).toBe('50');
  });

  it('should show loading state when form is submitted', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'Santiago');
    await user.type(m2Input, '50');
    await user.click(submitButton);

    expect(screen.getByText('Calculando...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should display success result after successful API call', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        min: 300000,
        max: 500000,
        comuna: 'Santiago',
        m2: 50,
      }),
    });

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'Santiago');
    await user.type(m2Input, '50');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Rango estimado: \$300\.000 - \$500\.000/i)).toBeInTheDocument();
    });
  });

  it('should display error message when API call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'NonExistent');
    await user.type(m2Input, '50');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo obtener la predicción/i)
      ).toBeInTheDocument();
    });
  });

  it('should display error message when fetch throws an error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'Santiago');
    await user.type(m2Input, '50');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo obtener la predicción/i)
      ).toBeInTheDocument();
    });
  });

  it('should clear previous results when submitting again', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ min: 300000, max: 500000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ min: 400000, max: 600000 }),
      });

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'Santiago');
    await user.type(m2Input, '50');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/300\.000/i)).toBeInTheDocument();
    });

    await user.clear(comunaInput);
    await user.clear(m2Input);
    await user.type(comunaInput, 'Providencia');
    await user.type(m2Input, '60');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/400\.000/i)).toBeInTheDocument();
      expect(screen.queryByText(/300\.000/i)).not.toBeInTheDocument();
    });
  });

  it('should clear previous errors when submitting again', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ min: 300000, max: 500000 }),
      });

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'Bad');
    await user.type(m2Input, '50');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/No se pudo obtener la predicción/i)).toBeInTheDocument();
    });

    await user.clear(comunaInput);
    await user.type(comunaInput, 'Santiago');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Rango estimado/i)).toBeInTheDocument();
      expect(screen.queryByText(/No se pudo obtener la predicción/i)).not.toBeInTheDocument();
    });
  });

  it('should call API with correct encoded parameters', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ min: 300000, max: 500000 }),
    });

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'Las Condes');
    await user.type(m2Input, '75');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/predict?comuna=Las%20Condes&m2=75'
      );
    });
  });

  it('should prevent form submission when fields are empty', async () => {
    const user = userEvent.setup();
    render(<WidgetPage />);

    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.click(submitButton);

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should format large numbers with locale string', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        min: 1000000,
        max: 2000000,
      }),
    });

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'Santiago');
    await user.type(m2Input, '100');
    await user.click(submitButton);

    await waitFor(() => {
      const result = screen.getByText(/Rango estimado/i);
      expect(result.textContent).toContain('1');
      expect(result.textContent).toContain('2');
    });
  });

  it('should re-enable button after loading completes', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ min: 300000, max: 500000 }),
    });

    const user = userEvent.setup();
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);
    const submitButton = screen.getByRole('button', { name: /Predecir/i });

    await user.type(comunaInput, 'Santiago');
    await user.type(m2Input, '50');
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should have correct input types and attributes', () => {
    render(<WidgetPage />);

    const comunaInput = screen.getByPlaceholderText(/Providencia/i);
    const m2Input = screen.getByPlaceholderText(/60/);

    expect(comunaInput).toHaveAttribute('type', 'text');
    expect(comunaInput).toHaveAttribute('placeholder', 'Ej: Providencia');

    expect(m2Input).toHaveAttribute('type', 'number');
    expect(m2Input).toHaveAttribute('placeholder', 'Ej: 60');
    expect(m2Input).toHaveAttribute('min', '1');
  });
});
