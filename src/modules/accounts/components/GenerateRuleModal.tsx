import { Component, createSignal, Show } from 'solid-js';
import { Button } from '../../ui';
import { automationApi } from '../../../services/apiAdapter';
import { AutomationRule } from '../types/automationTypes';
import { authStore } from '../../../stores/authStore';

interface GenerateRuleModalProps {
    onRuleGenerated: (rule: AutomationRule) => void;
    onClose: () => void;
}

const GenerateRuleModal: Component<GenerateRuleModalProps> = (props) => {
    const [inputData, setInputData] = createSignal('');
    const [eventType, setEventType] = createSignal('invoice_completed');
    const [isLoading, setIsLoading] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    const eventTypes = [
        { value: 'invoice_completed', label: 'Invoice Completed' },
        { value: 'payment_received', label: 'Payment Received' },
        { value: 'inventory_movement', label: 'Inventory Movement' },
        { value: 'expense_created', label: 'Expense Created' }
    ];

    const handleGenerate = async () => {
        try {
            if (!inputData()) {
                setError('Please provide JSON data');
                return;
            }

            let parsedData;
            try {
                parsedData = JSON.parse(inputData());
            } catch (e) {
                setError('Invalid JSON format');
                return;
            }

            setIsLoading(true);
            setError(null);

            const rule = await automationApi.generateRuleFromData(
                parsedData,
                authStore.getBusinessId(),
                eventType()
            );

            if (rule) {
                props.onRuleGenerated(rule);
                props.onClose();
            } else {
                setError('Failed to generate rule. Please check your data and try again.');
            }
        } catch (err: any) {
            console.error("Error generating rule:", err);
            setError(err.message || 'An error occurred while generating the rule');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            'background-color': 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'z-index': '1000'
        }}>
            <div style={{
                'background-color': 'white',
                'border-radius': '0.5rem',
                padding: '2rem',
                'max-width': '600px',
                width: '90%',
                'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <h2 style={{ 'font-size': '1.5rem', 'font-weight': '700', 'margin-bottom': '1rem' }}>
                    Generate Rule from Data
                </h2>

                <p style={{ 'margin-bottom': '1.5rem', color: '#666' }}>
                    Paste a sample JSON object (e.g., invoice data) and select the event type.
                    The system will analyze the data to suggest an automation rule.
                </p>

                <div style={{ 'margin-bottom': '1rem' }}>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                        Event Type
                    </label>
                    <select
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            'border-radius': '0.375rem',
                            'background-color': 'white'
                        }}
                        value={eventType()}
                        onChange={(e) => setEventType(e.currentTarget.value)}
                    >
                        <Show when={true}>
                            {eventTypes.map(type => (
                                <option value={type.value}>{type.label}</option>
                            ))}
                        </Show>
                    </select>
                </div>

                <div style={{ 'margin-bottom': '1rem' }}>
                    <label style={{ display: 'block', 'font-weight': '500', 'margin-bottom': '0.5rem' }}>
                        Sample Data (JSON)
                    </label>
                    <textarea
                        style={{
                            width: '100%',
                            height: '200px',
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            'border-radius': '0.375rem',
                            'font-family': 'monospace',
                            resize: 'vertical'
                        }}
                        value={inputData()}
                        onInput={(e) => setInputData(e.currentTarget.value)}
                        placeholder='{ "invoice": "INV-001", "total": 150.00, ... }'
                    />
                </div>

                <Show when={error()}>
                    <div style={{
                        'background-color': '#fee2e2',
                        color: '#b91c1c',
                        padding: '0.75rem',
                        'border-radius': '0.375rem',
                        'margin-bottom': '1rem',
                        'font-size': '0.875rem'
                    }}>
                        {error()}
                    </div>
                </Show>

                <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '1rem' }}>
                    <Button variant="secondary" onClick={props.onClose} disabled={isLoading()}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleGenerate} disabled={isLoading()}>
                        {isLoading() ? 'Generating...' : 'Generate Rule'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default GenerateRuleModal;
