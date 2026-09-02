import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { WorkspaceDomainsModule } from 'src/engine/core-modules/domain/workspace-domains/workspace-domains.module';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserModule } from 'src/engine/core-modules/user/user.module';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

import { ReqtecKeycloakAuthController } from './reqtec-keycloak-auth.controller';
import { ReqtecKeycloakOidcService } from './reqtec-keycloak-oidc.service';

@Module({
  imports: [
    TokenModule,
    UserModule,
    WorkspaceDomainsModule,
    TypeOrmModule.forFeature([
      UserEntity,
      WorkspaceEntity,
      UserWorkspaceEntity,
    ]),
  ],
  controllers: [ReqtecKeycloakAuthController],
  providers: [ReqtecKeycloakOidcService],
})
export class ReqtecKeycloakModule {}
