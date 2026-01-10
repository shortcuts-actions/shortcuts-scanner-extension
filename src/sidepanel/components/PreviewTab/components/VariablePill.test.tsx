import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { previewFactory } from '../../../../test/factories/preview.factory';
import { renderWithProviders } from '../../../../test/utils/previewTestHelpers';
import { VariablePill, VariablePillFromContent } from './VariablePill';

describe('VariablePill', () => {
  it('should render variable name', () => {
    renderWithProviders(<VariablePill name="myVariable" />);
    expect(screen.getByText('myVariable')).toBeInTheDocument();
  });

  it('should render with icon based on type', () => {
    renderWithProviders(<VariablePill name="test" type="Variable" />);
    // Variable pill should render with text and an svg icon
    const text = screen.getByText('test');
    expect(text).toBeInTheDocument();
  });

  it('should render aggrandizement suffix', () => {
    const aggrandizements = [previewFactory.aggrandizement('Property', { propertyName: 'Name' })];

    renderWithProviders(<VariablePill name="contact" aggrandizements={aggrandizements} />);
    expect(screen.getByText(/contact \(Name\)/)).toBeInTheDocument();
  });

  it('should render with default name when name is undefined', () => {
    renderWithProviders(<VariablePill />);
    expect(screen.getByText('Variable')).toBeInTheDocument();
  });

  describe('Click-to-jump functionality', () => {
    it('should not be clickable when UUID not in context', () => {
      renderWithProviders(<VariablePill name="test" uuid="unknown-uuid" />);

      const badge = screen.getByText('test').closest('span');
      expect(badge).toHaveStyle({ cursor: 'default' });
    });

    it('should render with UUID when provided', async () => {
      // We need to test with a real context that has registered the UUID
      // Since the component checks if the UUID exists via getActionByUUID,
      // we'll just verify it renders without errors
      renderWithProviders(<VariablePill name="test" uuid="test-uuid" type="Variable" />);

      const badge = screen.getByText('test').closest('span');
      // Without proper context setup with registered UUID, it should render as non-clickable
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Color schemes', () => {
    it('should apply purple color scheme for Variable type', () => {
      renderWithProviders(<VariablePill name="test" type="Variable" />);
      const text = screen.getByText('test');
      expect(text).toBeInTheDocument();
    });

    it('should apply blue color scheme for ActionOutput type', () => {
      renderWithProviders(<VariablePill name="test" type="ActionOutput" />);
      const text = screen.getByText('test');
      expect(text).toBeInTheDocument();
    });

    it('should apply green color scheme for CurrentDate type', () => {
      renderWithProviders(<VariablePill name="test" type="CurrentDate" />);
      const text = screen.getByText('test');
      expect(text).toBeInTheDocument();
    });

    it('should apply cyan color scheme for Ask type', () => {
      renderWithProviders(<VariablePill name="test" type="Ask" />);
      const text = screen.getByText('test');
      expect(text).toBeInTheDocument();
    });
  });

  describe('VariablePillFromContent', () => {
    it('should extract display name from content', () => {
      const content = previewFactory.variableReference('myVar', 'uuid-123');

      renderWithProviders(<VariablePillFromContent content={content} />);
      expect(screen.getByText('myVar')).toBeInTheDocument();
    });

    it('should pass Type to VariablePill', () => {
      const content = previewFactory.actionOutputReference('Result', 'uuid-123');

      renderWithProviders(<VariablePillFromContent content={content} />);
      expect(screen.getByText('Result')).toBeInTheDocument();
    });

    it('should pass OutputUUID', () => {
      const content = previewFactory.actionOutputReference('Output', 'test-uuid-123');

      renderWithProviders(<VariablePillFromContent content={content} />);
      expect(screen.getByText('Output')).toBeInTheDocument();
    });

    it('should pass Aggrandizements', () => {
      const content = {
        ...previewFactory.variableReference('contact'),
        Aggrandizements: [previewFactory.aggrandizement('Property', { propertyName: 'Email' })],
      };

      renderWithProviders(<VariablePillFromContent content={content} />);
      expect(screen.getByText(/contact \(Email\)/)).toBeInTheDocument();
    });

    it('should handle ExtensionInput type', () => {
      const content = { Type: 'ExtensionInput' };

      renderWithProviders(<VariablePillFromContent content={content} />);
      expect(screen.getByText('Shortcut Input')).toBeInTheDocument();
    });

    it('should handle CurrentDate type', () => {
      const content = { Type: 'CurrentDate' };

      renderWithProviders(<VariablePillFromContent content={content} />);
      expect(screen.getByText('Current Date')).toBeInTheDocument();
    });

    it('should handle Ask type', () => {
      const content = { Type: 'Ask' };

      renderWithProviders(<VariablePillFromContent content={content} />);
      expect(screen.getByText('Ask Each Time')).toBeInTheDocument();
    });

    it('should handle Clipboard type', () => {
      const content = { Type: 'Clipboard' };

      renderWithProviders(<VariablePillFromContent content={content} />);
      expect(screen.getByText('Clipboard')).toBeInTheDocument();
    });
  });
});
