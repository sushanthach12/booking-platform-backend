export const PROPERTY_INDEX_NAME = 'properties';

export const PROPERTY_INDEX_DEFINITION = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        autocomplete: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'edge_ngram_filter'],
        },
      },
      filter: {
        edge_ngram_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 15,
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'autocomplete',
        search_analyzer: 'standard',
      },
      description: { type: 'text' },
      city: { type: 'keyword' },
      location: { type: 'geo_point' },
      pricePerNight: { type: 'float' },
      amenities: { type: 'keyword' },
      propertyType: { type: 'keyword' },
      rating: { type: 'float' },
      isAvailable: { type: 'boolean' },
      createdAt: { type: 'date' },
    },
  },
};
