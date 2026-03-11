import { fetchGraphQL, convertObj2Array, fetchGraphQLSS, generateRandomId } from '../utils';
import { EventAutomationRule } from '../../modules/events/types/eventTypes';
import { authStore } from '../../stores/authStore';
import { apiAdapter, hybridCall } from '../apiAdapter';
import { fakeServer } from '../fakeServer';

/**
 * Event Rules API Service
 * Manages event automation rules through GraphQL API
 */
export const eventRulesApi = {
  /**
   * Get all event rules for the current business.  
   */
  async getAll(query?: string, filters?: any): Promise<EventAutomationRule[]> {
        let  params: Record<string, any> = {
          businessId: authStore.getBusinessId(),
          ":search4": authStore.getBusinessId(),
        }
    
         if (filters?.search) {
          //query += " "+filters.search;
        }
       
        if(query && query.trim()){
          query.split(" ").map((qry,inDq)=>{
            if(qry){
                params[":search"+inDq] = qry.trim();
            }
          })
        }
    
        let bdyq2 = {
          query: "getAutomaticRules",
          queryString: "!* contain :search0 AND !* contain :search1 AND !* contain :search2 AND !* contain :search3 AND !* contain :search4 AND createdTimeStamp > :date1 AND createdTimeStamp < :date2 AND account contain :account AND subAccount contain :subAccount AND status = :status" ,
          params
        }
         
        const response = await fetchGraphQLSS(bdyq2)
        //console.log(response.data)
        return response.data || [];
  },

  /**
   * Get a single event rule by ID
   */
  async getById(ruleId: string): Promise<EventAutomationRule | null> {
    return hybridCall(
      async () => {
        const response = await fetchGraphQL({
          query: 'getEventRules',
          queryString: 'businessId = :businessId AND id = :ruleId',
          params: {
            ':businessId': authStore.getBusinessId(),
            ':ruleId': ruleId
          }
        });
        
        const rules = convertObj2Array(response) as EventAutomationRule[];
        return rules[0] || null;
      },
      () => fakeServer.eventRules.getById(ruleId)
    );
  },

  /**
   * Get rules by event type
   */
  async getByEventType(eventType: string): Promise<EventAutomationRule[]> {
    return hybridCall(
      async () => {
        const response = await fetchGraphQL({
          query: 'getEventRules',
          queryString: 'businessId = :businessId AND eventType = :eventType AND isActive = true',
          params: {
            ':businessId': authStore.getBusinessId(),
            ':eventType': eventType
          }
        });
        
        return convertObj2Array(response) as EventAutomationRule[];
      },
      () => fakeServer.eventRules.getByEventType(eventType)
    );
  },

  /**
   * Create a new event rule
   */
  async create(rule: Omit<EventAutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<EventAutomationRule> {
   
      const newRule = {
        ...rule,
        id: `rule_${generateRandomId()}`, // Generate unique ID
        businessId: authStore.getBusinessId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let  params: Record<string, any> = {
        businessId: authStore.getBusinessId()
      }
  
      let bdyq2 = {
        query: "addAutomaticRule",
        params,
        form: newRule
      } 

    
      const response = await fetchGraphQLSS(bdyq2)
     
      return response;
  },

  /**
   * Update an existing event rule
   */
  async update(ruleId: string, updates: Partial<EventAutomationRule>): Promise<EventAutomationRule> {
    
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    let  params: Record<string, any> = {
      businessId:  authStore.getBusinessId(),
      id: ruleId
    }
 
    let bdyq2 = {
      query: "updateAutomaticRule",
      params,
      form: updateData
    } 
    
   
    const response = await fetchGraphQLSS(bdyq2)
    console.log(JSON.stringify( bdyq2, null, 4))
    //console.log(response)
    return response;
       
  },

  /**
   * Delete an event rule
   */
  async delete(ruleId: string): Promise<{ success: boolean; message: string }> {
    return hybridCall(
      async () => {
        const response = await fetchGraphQL({
          query: 'deleteEventRules',
          params: {
            id: ruleId,
            businessId: authStore.getBusinessId()
          }
        });

        if (response?.deleteEventRules) {
          return {
            success: true,
            message: 'Event rule deleted successfully'
          };
        }

        throw new Error('Failed to delete event rule');
      },
      () => fakeServer.eventRules.delete(ruleId)
    );
  },

  /**
   * Toggle rule active status
   */
  async toggleActive(ruleId: string, isActive: boolean): Promise<EventAutomationRule> {
    return this.update(ruleId, { isActive });
  },

  /**
   * Test a rule with sample data
   */
  async testRule(rule: EventAutomationRule, sampleData: any): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
  

    let  params: Record<string, any> = {
      businessId:  authStore.getBusinessId()
    }
 
    let bdyq2 = {
      query: "executeRuleFromConnector",
      params,
      ...sampleData
    } 
    
   
    const response = await fetchGraphQLSS(bdyq2)
    //console.log(JSON.stringify( bdyq2, null, 4))
    //console.log(response)
    return response;
  },

  /**
   * Get rule execution history
   */
  async getExecutionHistory(ruleId?: string, limit: number = 100): Promise<Array<{
    id: string;
    ruleId: string;
    eventId: string;
    eventType: string;
    executedAt: Date;
    success: boolean;
    journalEntryId?: string;
    error?: string;
  }>> {
    return hybridCall(
      async () => {
        const queryString = ruleId 
          ? 'businessId = :businessId AND ruleId = :ruleId'
          : 'businessId = :businessId';
        
        const params: any = {
          ':businessId': authStore.getBusinessId()
        };
        
        if (ruleId) {
          params[':ruleId'] = ruleId;
        }

        const response = await fetchGraphQL({
          query: 'getEventRuleHistory',
          queryString,
          params,
          form: { limit }
        });

        return convertObj2Array(response) as any[];
      },
      () => fakeServer.eventRules.getExecutionHistory(ruleId, limit)
    );
  },

  /**
   * Bulk enable/disable rules
   */
  async bulkToggle(ruleIds: string[], isActive: boolean): Promise<{
    success: boolean;
    updated: number;
    failed: string[];
  }> {
    return hybridCall(
      async () => {
        const response = await fetchGraphQL({
          query: 'bulkUpdateEventRules',
          form: {
            ruleIds,
            updates: { isActive, updatedAt: new Date().toISOString() },
            businessId: authStore.getBusinessId()
          }
        });

        return response?.bulkUpdateEventRules || {
          success: false,
          updated: 0,
          failed: ruleIds
        };
      },
      () => fakeServer.eventRules.bulkToggle(ruleIds, isActive)
    );
  },

  /**
   * Export rules configuration
   */
  async exportRules(): Promise<EventAutomationRule[]> {
    const rules = await this.getAll();
    // Remove business-specific IDs for export
    return rules.map(rule => ({
      ...rule,
      id: undefined,
      businessId: undefined
    } as any));
  },

  /**
   * Import rules configuration
   */
  async importRules(rules: EventAutomationRule[]): Promise<{
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
  }> {
    return hybridCall(
      async () => {
        const response = await fetchGraphQL({
          query: 'importEventRules',
          form: {
            rules: rules.map(rule => ({
              ...rule,
              businessId: authStore.getBusinessId()
            })),
            businessId: authStore.getBusinessId()
          }
        });

        return response?.importEventRules || {
          success: false,
          imported: 0,
          failed: rules.length,
          errors: ['Import failed']
        };
      },
      () => fakeServer.eventRules.importRules(rules)
    );
  }
};

// Helper function to convert API response to proper types
function processRuleFromApi(apiRule: any): EventAutomationRule {
  return {
    ...apiRule,
    createdAt: new Date(apiRule.createdAt),
    updatedAt: new Date(apiRule.updatedAt),
    conditions: apiRule.conditions || [],
    journalEntryTemplate: {
      ...apiRule.journalEntryTemplate,
      lines: apiRule.journalEntryTemplate?.lines || []
    }
  };
}




/*

Pedro Gomez Guerrero
405617880

6780 BRITTANY OAK DR
LOUISVILLE, KY 40229
 
pedrogg2@yahoo.com
502.  6192985

2022 159
2023 
*/