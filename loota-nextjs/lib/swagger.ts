import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    api: [], // defines where your API routes are
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Loota API Documentation',
        version: '1.0',
      },
      paths: {
        '/api/hunts': {
          get: {
            summary: 'Retrieve all hunts',
            description: 'Returns a list of all available hunts.',
            responses: {
              '200': {
                description: 'A list of hunts.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            format: 'uuid',
                          },
                          type: {
                            type: 'string',
                          },
                          createdAt: {
                            type: 'string',
                            format: 'date-time',
                          },
                          updatedAt: {
                            type: 'string',
                            format: 'date-time',
                          },
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Internal Server Error',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            summary: 'Create a new hunt',
            description: 'Creates a new hunt with specified type and associated pins.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['type', 'pins'],
                    properties: {
                      type: {
                        type: 'string',
                        description: 'The type of the hunt (e.g., \'geolocation\' or \'proximity\').',
                        enum: ['geolocation', 'proximity'],
                      },
                      pins: {
                        type: 'array',
                        description: 'An array of pin objects associated with the hunt.',
                        items: {
                          type: 'object',
                          properties: {
                            lat: {
                              type: 'number',
                              format: 'float',
                              description: 'Latitude for geolocation pins.',
                            },
                            lng: {
                              type: 'number',
                              format: 'float',
                              description: 'Longitude for geolocation pins.',
                            },
                            distanceFt: {
                              type: 'number',
                              format: 'float',
                              description: 'Distance in feet for proximity pins.',
                            },
                            directionStr: {
                              type: 'string',
                              description: 'Direction string for proximity pins (e.g., "N45E").',
                            },
                            x: {
                              type: 'number',
                              format: 'float',
                              description: 'Relative X coordinate for proximity pins.',
                            },
                            y: {
                              type: 'number',
                              format: 'float',
                              description: 'Relative Y coordinate for proximity pins.',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Hunt created successfully. Returns the new hunt\'s ID.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        huntId: {
                          type: 'string',
                          format: 'uuid',
                          example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid request data.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Invalid request data',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Internal Server Error',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/hunts/{huntId}': {
          get: {
            summary: 'Retrieve a specific hunt',
            description: 'Returns details of a single hunt by its ID, including its pins.',
            parameters: [
              {
                in: 'path',
                name: 'huntId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the hunt to retrieve.',
              },
            ],
            responses: {
              '200': {
                description: 'Details of the hunt.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                        },
                        type: {
                          type: 'string',
                        },
                        createdAt: {
                          type: 'string',
                          format: 'date-time',
                        },
                        updatedAt: {
                          type: 'string',
                          format: 'date-time',
                        },
                        pins: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string',
                                format: 'uuid',
                              },
                              huntId: {
                                type: 'string',
                                format: 'uuid',
                              },
                              lat: {
                                type: 'number',
                                format: 'float',
                              },
                              lng: {
                                type: 'number',
                                format: 'float',
                              },
                              distanceFt: {
                                type: 'number',
                                format: 'float',
                              },
                              directionStr: {
                                type: 'string',
                              },
                              x: {
                                type: 'number',
                                format: 'float',
                              },
                              y: {
                                type: 'number',
                                format: 'float',
                              },
                              createdAt: {
                                type: 'string',
                                format: 'date-time',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, hunt ID is missing.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Hunt ID is required',
                        },
                      },
                    },
                  },
                },
              },
              '404': {
                description: 'Hunt not found.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Hunt not found',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Internal Server Error',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          delete: {
            summary: 'Delete a hunt',
            description: 'Deletes a specific hunt by its ID. This operation is irreversible.',
            parameters: [
              {
                in: 'path',
                name: 'huntId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the hunt to delete.',
              },
            ],
            responses: {
              '200': {
                description: 'Hunt deleted successfully.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Hunt deleted successfully',
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, hunt ID is missing.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Hunt ID is required',
                        },
                      },
                    },
                  },
                },
              },
              '404': {
                description: 'Hunt not found.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Hunt not found',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Internal Server Error',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/hunts/{huntId}/participants': {
          post: {
            summary: 'Add a user to a hunt (join hunt)',
            description: 'Creates a new HuntParticipation record, associating a user with a specific hunt.',
            parameters: [
              {
                in: 'path',
                name: 'huntId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the hunt to join.',
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['userId'],
                    properties: {
                      userId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The ID of the user joining the hunt.',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'User successfully joined the hunt.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'User successfully joined the hunt',
                        },
                        participationId: {
                          type: 'string',
                          format: 'uuid',
                          example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, missing required fields or invalid data.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'User ID is required',
                        },
                      },
                    },
                  },
                },
              },
              '404': {
                description: 'Hunt or User not found.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Hunt or User not found',
                        },
                      },
                    },
                  },
                },
              },
              '409': {
                description: 'Conflict, user is already participating in this hunt.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'User is already participating in this hunt',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Failed to add user to hunt',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          delete: {
            summary: 'Remove a user from a hunt (leave hunt)',
            description: 'Deletes a HuntParticipation record, removing a user from a specific hunt.',
            parameters: [
              {
                in: 'path',
                name: 'huntId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the hunt to leave.',
              },
              {
                in: 'query',
                name: 'userId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the user to remove from the hunt.',
              },
            ],
            responses: {
              '200': {
                description: 'User successfully removed from the hunt.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'User successfully removed from the hunt',
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, missing required fields.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'User ID is required',
                        },
                      },
                    },
                  },
                },
              },
              '404': {
                description: 'Hunt participation not found.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Hunt participation not found',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Failed to remove user from hunt',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          get: {
            summary: 'Retrieve participants for a specific hunt',
            description: 'Returns a list of all users participating in a given hunt.',
            parameters: [
              {
                in: 'path',
                name: 'huntId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the hunt to retrieve participants for.',
              },
            ],
            responses: {
              '200': {
                description: 'A list of hunt participants.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                            format: 'uuid',
                          },
                          userId: {
                            type: 'string',
                            format: 'uuid',
                          },
                          huntId: {
                            type: 'string',
                            format: 'uuid',
                          },
                          joinedAt: {
                            type: 'string',
                            format: 'date-time',
                          },
                          user: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string',
                                format: 'uuid',
                              },
                              name: {
                                type: 'string',
                              },
                              phone: {
                                type: 'string',
                                nullable: true,
                              },
                              paypalId: {
                                type: 'string',
                                nullable: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, hunt ID is missing.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Hunt ID is required',
                        },
                      },
                    },
                  },
                },
              },
              '404': {
                description: 'Hunt not found.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Hunt not found',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Internal Server Error',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/hunts/{huntId}/win': {
          post: {
            summary: 'Notify the server of a hunt win',
            description: 'Records a user as the winner of a specific hunt.',
            parameters: [
              {
                in: 'path',
                name: 'huntId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the hunt that was won.',
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['userId', 'timestamp', 'proofOfWin'],
                    properties: {
                      userId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'The ID of the user who won the hunt.',
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'The timestamp when the win occurred.',
                      },
                      proofOfWin: {
                        type: 'object',
                        description: 'Data to validate the win (e.g., coordinates, collected items).',
                        example: {
                          latitude: 34.052235,
                          longitude: -118.243683,
                        },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Win recorded successfully.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Win recorded successfully',
                        },
                        hunt: {
                          type: 'object',
                          description: 'The updated hunt object.',
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, missing required fields.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Missing required fields',
                        },
                      },
                    },
                  },
                },
              },
              '403': {
                description: 'Forbidden, invalid win proof.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Invalid win proof',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal server error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Failed to record win',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/users/register': {
          post: {
            summary: 'Register a new user',
            description: 'Creates a new user account with optional phone and PayPal ID.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                      name: {
                        type: 'string',
                        description: 'The user\'s name.',
                      },
                      phone: {
                        type: 'string',
                        description: 'Optional phone number for the user (must be unique if provided).',
                      },
                      paypalId: {
                        type: 'string',
                        description: 'Optional PayPal ID for receiving winnings (must be unique if provided).',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'User registered successfully. Returns the new user\'s ID.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'User registered successfully',
                        },
                        userId: {
                          type: 'string',
                          format: 'uuid',
                          example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, missing required fields.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Name is required',
                        },
                      },
                    },
                  },
                },
              },
              '409': {
                description: 'Conflict, user with provided phone or PayPal ID already exists.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'User with this phone number already exists',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal server error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error: {
                          type: 'string',
                          example: 'Failed to register user',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/users/{userId}': {
          get: {
            summary: 'Retrieve a specific user',
            description: 'Returns details of a single user by their ID.',
            parameters: [
              {
                in: 'path',
                name: 'userId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the user to retrieve.',
              },
            ],
            responses: {
              '200': {
                description: 'Details of the user.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                        },
                        name: {
                          type: 'string',
                        },
                        phone: {
                          type: 'string',
                          nullable: true,
                        },
                        paypalId: {
                          type: 'string',
                          nullable: true,
                        },
                        createdAt: {
                          type: 'string',
                          format: 'date-time',
                        },
                        updatedAt: {
                          type: 'string',
                          format: 'date-time',
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, user ID is missing.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'User ID is required',
                        },
                      },
                    },
                  },
                },
              },
              '404': {
                description: 'User not found.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'User not found',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Internal Server Error',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          delete: {
            summary: 'Delete a user',
            description: 'Deletes a specific user by their ID. This operation is irreversible.',
            parameters: [
              {
                in: 'path',
                name: 'userId',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                description: 'The ID of the user to delete.',
              },
            ],
            responses: {
              '200': {
                description: 'User deleted successfully.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'User deleted successfully',
                        },
                      },
                    },
                  },
                },
              },
              '400': {
                description: 'Bad request, user ID is missing.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'User ID is required',
                        },
                      },
                    },
                  },
                },
              },
              '404': {
                description: 'User not found.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'User not found',
                        },
                      },
                    },
                  },
                },
              },
              '500': {
                description: 'Internal Server Error.',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Internal Server Error',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      security: [], // Add security definitions here if you have authentication
    },
  });
  return spec;
};
