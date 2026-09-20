import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';

export interface GuardrailsStackProps extends StackProps {
  monthlyLimitUsd: number;
  alertEmail: string;
}

// Prompt D1 — costs nothing to create; AWS Budgets itself is free. Tracks TOTAL account spend
// (not filtered to the project=careerlens tag) since cost-allocation tags need a manual
// activation step in Billing preferences plus a ~24h delay before they're filterable — total
// account spend works immediately and is the safer default for a dedicated hackathon account.
export class GuardrailsStack extends Stack {
  constructor(scope: Construct, id: string, props: GuardrailsStackProps) {
    super(scope, id, props);

    const subscriber = { subscriptionType: 'EMAIL', address: props.alertEmail };

    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: props.monthlyLimitUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: [50, 80, 100].map((threshold) => ({
        notification: {
          notificationType: 'ACTUAL',
          comparisonOperator: 'GREATER_THAN',
          threshold,
          thresholdType: 'PERCENTAGE',
        },
        subscribers: [subscriber],
      })),
    });

    Tags.of(this).add('project', 'careerlens');
  }
}
