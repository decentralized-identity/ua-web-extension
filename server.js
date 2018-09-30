
const fs = require('fs');
const Koa = require('koa');
const Router = require('koa-router');
const mount = require("koa-mount");
const static = require('koa-static');
const bodyParser = require('koa-body');

const app = new Koa();
const router = new Router();

const testDIDs = {
  "did:foo:123": {
    "didReference": {
      "didReference": "did:foo:123",
      "did": "did:foo:123",
      "method": "foo",
      "specificId": "123",
      "service": null,
      "path": null,
      "query": null,
      "fragment": null
    },
    "didDocument": {
      "id": "did:foo:123",
      "service": [
        {
          "type": "IdentityHub",
          "publicKey": "did:foo:123#key-1",
          "serviceEndpoint": {
            "@context": "schema.identity.foundation/hub",
            "@type": "DIDServiceEndpoint",
            "instances": ["did:bar:456", "did:zaz:789"]
          }
        }
      ],
      "authentication": {
        "type": "Ed25519SignatureAuthentication2018",
        "publicKey": ["did:foo:123#key-1"]
      },
      "publicKey": [
        {
          "id": "did:foo:123#key-1",
          "type": "Ed25519VerificationKey2018",
          "publicKeyBase58": "H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV"
        }
      ],
      "@context": "https://w3id.org/did/v1"
    },
    "driverMetadata": {},
    "resolverMetadata": {}
  },
  "did:bar:456": {
    "didReference": {
      "didReference": "did:bar:456",
      "did": "did:bar:456",
      "method": "bar",
      "specificId": "456",
      "service": null,
      "path": null,
      "query": null,
      "fragment": null
    },
    "didDocument": {
      "id": "did:bar:456",
      "service": {
        "type": "IdentityHubHost",
        "publicKey": ["did:bar:456#key-1"],
        "serviceEndpoint": "/hub/bar"
      },
      "authentication": {
        "type": "Ed25519SignatureAuthentication2018",
        "publicKey": [
          "did:bar:456#key-1"
        ]
      },
      "publicKey": [
        {
          "id": "did:bar:456#key-1",
          "type": "Ed25519VerificationKey2018",
          "publicKeyBase58": "H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV"
        }
      ],
      "@context": "https://w3id.org/did/v1"
    },
    "driverMetadata": {},
    "resolverMetadata": {}
  },
  "did:zaz:789": {
    "didReference": {
      "didReference": "did:zaz:789",
      "did": "did:zaz:789",
      "method": "zaz",
      "specificId": "789",
      "service": null,
      "path": null,
      "query": null,
      "fragment": null
    },
    "didDocument": {
      "id": "did:zaz:789",
      "service": {
        "type": "IdentityHubHost",
        "publicKey": "did:zaz:789#key-1",
        "serviceEndpoint": "/hub/zaz"
      },
      "authentication": {
        "type": "Ed25519SignatureAuthentication2018",
        "publicKey": [
          "did:zaz:789#key-1"
        ]
      },
      "publicKey": [
        {
          "id": "did:zaz:789#key-1",
          "type": "Ed25519VerificationKey2018",
          "publicKeyBase58": "H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV"
        }
      ],
      "@context": "https://w3id.org/did/v1"
    },
    "driverMetadata": {},
    "resolverMetadata": {}
  }
};

router.get('/', async (ctx, next) => {
  ctx.type = 'html';
  ctx.body = fs.createReadStream('index.html');
  await next();
});

router.get('/1.0/identifiers/:did', async (ctx, next) => {
  console.log(ctx.request.body);
  var json = testDIDs[ctx.params.did];
  ctx.response.body = json;
  await next();
});

router.post('/hub/:instance', async (ctx, next) => {
  if (ctx.params.instance == 'bar') {
    ctx.throw(503, 'Not Available');
  }
  else ctx.response.body = 'success';
  await next();
});

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .use(mount('/', static('./')))
  .use(mount('/global', static('./global')))

app.listen(3000, () => {
  console.log(`Your app is running on port 3000`);
});
